import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { v4 as uuidv4 } from 'uuid';

admin.initializeApp();

// Initialize OAuth2 Client using process.env
// Note: process.env will be populated from .env file at runtime
const getOAuthClient = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        // The callback redirect URI must match exactly what is set in Google Cloud Console
        // For development/emulator, this might be formatted differently, but here is the cloud format:
        // https://us-central1-<PROJECT_ID>.cloudfunctions.net/handleGoogleCallback
        // User should update this env var or hardcode strictly. 
        process.env.GOOGLE_REDIRECT_URI
    );
};

// 1. Generate Google Auth URL
// Callable function: Client calls this to get the URL to start the flow.
export const getGoogleAuthURL = onCall({ cors: true }, async (request) => {
    const oauth2Client = getOAuthClient();

    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Crucial for getting a Refresh Token
        scope: scopes,
        prompt: 'consent', // Force approval to ensure refresh token is returned
        // We can pass state if needed for security (CSRF), e.g., user ID hash
        state: request.auth?.uid // Pass the UID in state to verify in callback if desired (though callback handles logic)
    });

    return { url };
});

// 2. Handle Google Callback (Redirect URI)
// This is an HTTP Request function because Google redirects the browser here.
export const handleGoogleCallback = onRequest({ cors: true }, async (req, res) => {
    console.info('--- STARTING AUTH FLOW ---');
    const code = req.query.code as string;
    const state = req.query.state as string; // Optional: use this to validate or redirect back to specific app route

    if (!code) {
        console.error('Missing auth code in callback');
        res.status(400).send("Missing auth code");
        return;
    }

    try {
        const oauth2Client = getOAuthClient();
        const { tokens } = await oauth2Client.getToken(code);

        // Required: Verify we have the necessary tokens
        if (!tokens.access_token) {
            res.status(500).send("No access token returned");
            return;
        }

        oauth2Client.setCredentials(tokens);

        // Get user profile to identify the connected calendar account
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;

        if (!email) {
            res.status(500).send("Could not retrieve email from Google Account");
            return;
        }

        // We need to associate this with the Firebase User.
        // Since this is a server-to-server callback (or browser redirect), we don't inherently have the firebase auth context of the 'session' easily unless passed in 'state'.
        // If we passed `uid` in `state` param during getGoogleAuthURL:
        const userId = state; // Assuming simplistic state=uid usage for this example

        if (!userId) {
            res.status(400).send("Missing user state identifier");
            return;
        }

        // Save to Firestore
        // users/{userId}/connected_calendars/{calendarEmail}
        const db = admin.firestore();
        await db.collection('users').doc(userId).collection('connected_calendars').doc(email).set({
            refreshToken: tokens.refresh_token || null, // Might be undefined if user re-auths without prompt='consent' (but we forced it)
            accessToken: tokens.access_token,
            expiryDate: tokens.expiry_date,
            syncToken: null,
            calendarEmail: email,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Automatically start watching for changes (Real-time Sync) and perform initial sync
        try {
            console.info(`Starting webhook watch and initial sync for ${email}`);
            await registerWebhookWatch(userId, email, tokens.access_token, tokens.refresh_token);
            console.info(`Webhook registration and initial sync completed for ${email}`);
        } catch (watchError) {
            console.error("Failed to auto-register webhook or sync", watchError);
            // Non-blocking: we still redirect success, but maybe log it.
        }

        // Success - Redirect back to the app
        // You should configure this environment variable to your frontend URL
        console.info('--- AUTH FLOW COMPLETE, REDIRECTING ---');
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        res.redirect(`${appUrl}/settings?success=true`);

    } catch (error) {
        console.error("Error exchanging token", error);
        res.status(500).send("Authentication failed");
    }
});

// 3. Sync Calendar Events (Incremental)
// Callable function: Client calls this to get latest events.
export const syncCalendarEvents = onCall({ cors: true }, async (request) => {
    // 1. Auth Check
    const userId = request.auth?.uid;
    if (!userId) {
        throw new HttpsError('unauthenticated', 'User must be signed in');
    }

    // Optional: Accept specific calendar email, otherwise trying to find one
    const targetEmail = request.data.calendarEmail;

    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');

    let calendarDoc;
    if (targetEmail) {
        calendarDoc = await calendarsRef.doc(targetEmail).get();
    } else {
        // Fallback: Get the first connected calendar
        const snapshot = await calendarsRef.limit(1).get();
        if (snapshot.empty) {
            throw new HttpsError('not-found', 'No connected calendars found');
        }
        calendarDoc = snapshot.docs[0];
    }

    if (!calendarDoc.exists) {
        throw new HttpsError('not-found', 'Calendar connection not found');
    }

    const data = calendarDoc.data();
    const { accessToken, refreshToken, syncToken, calendarEmail } = data || {};

    // 2. Setup OAuth
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 3. Sync Logic
    let events = [];
    let nextSyncToken = null;

    // Helper to perform the API call
    const listEvents = async (useSyncToken: string | null) => {
        const params: any = {
            calendarId: 'primary',
            singleEvents: true, // Expand recurring events
        };

        if (useSyncToken) {
            params.syncToken = useSyncToken;
        } else {
            // Full Sync: Last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            params.timeMin = thirtyDaysAgo.toISOString();
        }

        return await calendar.events.list(params);
    };

    try {
        let response;

        if (syncToken) {
            try {
                // Try Incremental Sync
                response = await listEvents(syncToken);
            } catch (err: any) {
                // Handle 410 Gone (Sync Token Invalid) -> Fallback to Full Sync
                if (err.code === 410) {
                    console.warn(`Sync token expired for ${calendarEmail}, performing full sync.`);
                    response = await listEvents(null);
                } else {
                    throw err;
                }
            }
        } else {
            // First Run / Full Sync
            response = await listEvents(null);
        }

        events = response.data.items || [];
        nextSyncToken = response.data.nextSyncToken;

        // 4. Update Database
        await calendarDoc.ref.update({
            syncToken: nextSyncToken || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            // If the access token was refreshed by the library, we ideally should listen to 'tokens' event,
            // but explicitly updating it here if changed is hard without the event listener. 
            // However, googleapis usually manages it. If we want to persist, we rely on the fact 
            // that we passed the refresh_token, so use it next time too.
        });

        return {
            events,
            calendarEmail
        };

    } catch (error) {
        console.error('Sync failed', error);
        throw new HttpsError('internal', 'Google Calendar Sync Failed');
    }
});


// SHARED HELPER: Sync Logic (extracted for reuse)
// Returns Promise<void>
const performCalendarSync = async (userId: string, calendarEmail: string) => {
    const db = admin.firestore();
    const calendarRef = db.collection('users').doc(userId).collection('connected_calendars').doc(calendarEmail);
    const calendarDoc = await calendarRef.get();

    if (!calendarDoc.exists) return;

    const { accessToken, refreshToken, syncToken } = calendarDoc.data() || {};

    // Setup OAuth
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Helper: list events with pagination support
    const listEvents = async (useSyncToken: string | null, pageToken: string | null = null) => {
        const params: any = {
            calendarId: 'primary',
            singleEvents: true, // Expand recurring events
            maxResults: 500, // Fetch more per page
            orderBy: 'startTime', // Prioritize soonest
            pageToken: pageToken || undefined
        };
        if (useSyncToken) {
            params.syncToken = useSyncToken;
        } else {
            // Full sync: 30 days ago to 1 year from now
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            params.timeMin = thirtyDaysAgo.toISOString();

            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            params.timeMax = oneYearFromNow.toISOString();

            console.info(`Full sync: fetching events from ${params.timeMin} to ${params.timeMax}`);
        }
        return await calendar.events.list(params);
    };

    let events: any[] = [];
    let nextSyncToken = null;

    try {
        console.info(`Starting sync for ${calendarEmail}, syncToken: ${syncToken ? 'exists' : 'null'}`);

        let currentPageToken = null;
        let isFirstPage = true;

        // Loop to fetch all pages
        do {
            let response: any;
            if (syncToken && isFirstPage) {
                try {
                    response = await listEvents(syncToken, currentPageToken);
                } catch (err: any) {
                    if (err.code === 410) {
                        console.warn(`Sync token expired for ${calendarEmail}, performing full sync.`);
                        response = await listEvents(null, currentPageToken);
                    } else {
                        console.error(`Incremental sync failed for ${calendarEmail}:`, err.message || err);
                        throw err;
                    }
                }
            } else {
                response = await listEvents(null, currentPageToken);
            }

            const items = response.data.items || [];
            events = events.concat(items);
            currentPageToken = response.data.nextPageToken;
            nextSyncToken = response.data.nextSyncToken; // Only present on last page
            isFirstPage = false;

            console.info(`Fetched page: ${items.length} items. Total so far: ${events.length}`);
        } while (currentPageToken);

        console.info(`Total events fetched across all pages: ${events.length}`);

        // Save Token
        await calendarRef.update({
            syncToken: nextSyncToken || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Upsert Events to Firestore
        console.info(`Upserting ${events.length} events to Firestore for user ${userId}`);
        const batch = db.batch();
        const eventsCol = db.collection('users').doc(userId).collection('tasks');

        for (const ev of events) {
            if (ev.status === 'cancelled') {
                // Handle deletion if we want
                // const docRef = eventsCol.where('googleEventId', '==', ev.id).limit(1); ...
                continue;
            }

            // Try to find existing by googleEventId to update, or create new
            // This requires a query unless we use googleEventId as doc ID?
            // If we use random IDs on creation, we need to query.
            const querySnap = await eventsCol.where('googleEventId', '==', ev.id).limit(1).get();

            const start = ev.start?.dateTime || ev.start?.date;
            const end = ev.end?.dateTime || ev.end?.date;

            const eventData = {
                title: ev.summary || '(No Title)',
                scheduledStart: start,
                scheduledEnd: end,
                dueAt: end, // Required for frontend query - should be ISO string
                isAllDay: !!ev.start?.date, // True if date-only
                notes: ev.description || '',
                googleEventId: ev.id,
                calendarEmail: calendarEmail,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Debug: Log first few events to verify field mapping
            if (events.indexOf(ev) < 3) {
                console.info(`EVENT FIELD CHECK - title: "${eventData.title}", scheduledStart: ${eventData.scheduledStart}, dueAt: ${eventData.dueAt}`);
            }

            if (!querySnap.empty) {
                batch.update(querySnap.docs[0].ref, eventData);
            } else {
                const newDoc = eventsCol.doc();
                batch.set(newDoc, {
                    ...eventData,
                    ownerUid: userId,
                    status: 'todo',
                    priority: 'medium',
                    assignedTo: [userId], // Required by taskSchema
                    sharedWith: [], // Required by taskSchema
                    contactIds: [], // Required by taskSchema
                    recurrence: null,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        // Log exact path and commit
        const firestorePath = `users/${userId}/tasks`;
        console.info(`WRITING TO PATH: ${firestorePath}`);
        console.info(`Batch contains operations for ${events.filter(e => e.status !== 'cancelled').length} events`);

        await batch.commit();
        console.info(`BATCH COMMIT SUCCESSFUL for ${calendarEmail}`);

    } catch (error: any) {
        console.error(`SYNC ERROR for ${calendarEmail}:`, error.message || error);
        console.error('FULL ERROR DETAILS:', JSON.stringify(error, null, 2));
    }
};

// Part 1: App -> Google (Export)
// Replaces createGoogleEvent with full export (Create/Update)
export const exportToGoogle = onDocumentWritten('users/{userId}/tasks/{taskId}', async (event) => {
    const change = event.data;
    if (!change) return; // Error

    const userId = event.params.userId;
    const db = admin.firestore();

    // Determine Type
    const isDelete = !change.after.exists;
    const isCreate = !change.before.exists;
    const data = (change.after.exists ? change.after.data() : change.before.data()) || {};

    // CRITICAL: Skip events that were synced FROM Google Calendar to prevent infinite loop
    // These events have calendarEmail set (indicating they came from external sync)
    if (data.calendarEmail && !isDelete) {
        console.log('Skipping export for synced event:', data.googleEventId);
        return;
    }

    // 1. Get Credentials
    // Optimization: Store a "primaryconnected" flag or just grab first
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');
    const calendarSnap = await calendarsRef.limit(1).get();
    if (calendarSnap.empty) return;
    const { accessToken, refreshToken } = calendarSnap.docs[0].data();

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
        if (isDelete) {
            if (data.googleEventId) {
                await calendar.events.delete({ calendarId: 'primary', eventId: data.googleEventId });
            }
        } else {
            // Create or Update
            const resource = {
                summary: data.title,
                description: data.notes,
                start: { dateTime: new Date(data.startTime || data.scheduledStart).toISOString() },
                end: { dateTime: new Date(data.endTime || data.scheduledEnd).toISOString() }
            };

            if (isCreate || !data.googleEventId) {
                if (data.googleEventId) return; // Already exists?
                const res = await calendar.events.insert({ calendarId: 'primary', requestBody: resource });
                await change.after.ref.update({ googleEventId: res.data.id });
            } else {
                // Update
                await calendar.events.update({ calendarId: 'primary', eventId: data.googleEventId, requestBody: resource });
            }
        }
    } catch (err) {
        console.error('Export failed', err);
    }
});


// Part 2: Google -> App (Webhook)
// 1. Start Watch (Callable)
// Shared Helper: Register Webhook
const registerWebhookWatch = async (userId: string, calendarEmail: string, accessToken: string | null | undefined, refreshToken: string | null | undefined) => {
    // If no access token (unlikely if called from callback, but possible from DB), getting client might fail if we don't handle it
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const channelId = uuidv4();
    const projectId = process.env.GCLOUD_PROJECT;
    const region = 'us-central1';
    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/handleCalendarWebhook`;

    const res = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
            id: channelId,
            type: 'web_hook',
            address: functionUrl,
            // expiration: 604800000 // 7 days default
        }
    });

    const db = admin.firestore();
    await db.collection('users').doc(userId).collection('connected_calendars').doc(calendarEmail).update({
        webhookChannelId: channelId,
        webhookResourceId: res.data.resourceId,
        webhookExpiration: res.data.expiration,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Immediate Initial Sync
    console.info(`Triggering initial sync for ${calendarEmail}`);
    // Non-blocking catch
    try {
        await performCalendarSync(userId, calendarEmail);
    } catch (e) {
        console.error('Initial sync failed', e);
    }

    return { channelId, expiration: res.data.expiration };
};

// Part 2: Google -> App (Webhook)
// 1. Start Watch (Callable) - Manual / Debug
export const startWebhookWatch = onCall({ cors: true }, async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'User must be signed in');

    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');
    const snapshot = await calendarsRef.limit(1).get();
    if (snapshot.empty) throw new HttpsError('not-found', 'No calendar');
    const calendarDoc = snapshot.docs[0];
    const { accessToken, refreshToken, calendarEmail } = calendarDoc.data();

    try {
        const result = await registerWebhookWatch(userId, calendarEmail, accessToken, refreshToken);
        return { success: true, ...result };
    } catch (error) {
        console.error('Failed to start watch', error);
        throw new HttpsError('internal', 'Failed to register webhook');
    }
});

// 2. Handle Webhook (HTTP)
export const handleCalendarWebhook = onRequest(async (req, res) => {
    const state = req.headers['x-goog-resource-state'];
    const channelId = req.headers['x-goog-channel-id'] as string;


    if (state === 'sync') {
        res.status(200).send('Sync OK');
        return;
    }

    if (state === 'exists') {
        // Find the user/calendar for this channel
        const db = admin.firestore();
        const query = await db.collectionGroup('connected_calendars')
            .where('webhookChannelId', '==', channelId)
            .limit(1)
            .get();

        if (query.empty) {
            console.warn('Unknown channel', channelId);
            res.status(404).send('Channel not found');
            return;
        }

        const doc = query.docs[0];
        // Doc path: users/{userId}/connected_calendars/{email}
        // userId is doc.ref.parent.parent.id
        const userId = doc.ref.parent.parent!.id;
        const { calendarEmail } = doc.data();

        await performCalendarSync(userId, calendarEmail);
    }

    res.status(200).send('OK');
});


// Part 3: Maintenance (Renewal Cron)
// Runs every 24 hours
export const renewWebhookWatch = onSchedule("every 24 hours", async (event) => {
    const db = admin.firestore();
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Find channels expiring in < 24 hours
    // This requires iterating or a complex query index. 
    // We'll query all connected_calendars with webhookChannelId existing (simple filter not possible easily unless indexed field)
    // For scalability, we should use a query. 
    // Let's assume we query for 'webhookExpiration' if we stored it as number, but Google sends string.
    // It's simpler to fetch all with webhookChannelId and check in memory for MVP.
    const snapshot = await db.collectionGroup('connected_calendars')
        .orderBy('webhookExpiration') // Needs index
        .get();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.webhookChannelId || !data.webhookExpiration) continue;

        const exp = parseInt(data.webhookExpiration);
        if (exp - now < ONE_DAY_MS) {
            // Needs renewal
            console.log(`Renewing webhook for ${doc.id}`);
            const { accessToken, refreshToken } = data;
            const oauth2Client = getOAuthClient();
            oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            // Stop old
            try {
                await calendar.channels.stop({
                    requestBody: {
                        id: data.webhookChannelId,
                        resourceId: data.webhookResourceId
                    }
                });
            } catch (e) { /* Ignore if already stopped */ }

            // Start new
            const projectId = process.env.GCLOUD_PROJECT;
            const region = 'us-central1';
            const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/handleCalendarWebhook`;
            const newChannelId = uuidv4();

            const res = await calendar.events.watch({
                calendarId: 'primary',
                requestBody: {
                    id: newChannelId,
                    type: 'web_hook',
                    address: functionUrl
                }
            });

            await doc.ref.update({
                webhookChannelId: newChannelId,
                webhookResourceId: res.data.resourceId,
                webhookExpiration: res.data.expiration
            });
        }
    }
});

// 3. Local Test Helper (Callable)
// Triggers the sync logic manually (for localhost testing)
export const simulateWebhookEvent = onCall({ cors: true }, async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'User must be signed in');

    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');

    // Get primary/first calendar
    const snapshot = await calendarsRef.limit(1).get();
    if (snapshot.empty) throw new HttpsError('not-found', 'No connected calendar');
    const { calendarEmail } = snapshot.docs[0].data();

    // Re-use logic
    await performCalendarSync(userId, calendarEmail);

    return { success: true, message: 'Sync simulated' };
});
