import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { v4 as uuidv4 } from 'uuid';

admin.initializeApp();

// Google Calendar colorId to hex mapping
const GOOGLE_COLOR_MAP: Record<string, string> = {
    '1': '#7986cb', // Lavender
    '2': '#33b679', // Sage
    '3': '#8e24aa', // Grape
    '4': '#e67c73', // Flamingo
    '5': '#f6bf26', // Banana
    '6': '#f4511e', // Tangerine
    '7': '#039be5', // Peacock
    '8': '#616161', // Graphite
    '9': '#3f51b5', // Blueberry
    '10': '#0b8043', // Basil
    '11': '#d50000', // Tomato
};

// Reverse map for lookup (Hex -> Google ID)
const HEX_TO_GOOGLE_COLOR_MAP: Record<string, string> = Object.entries(GOOGLE_COLOR_MAP)
    .reduce((acc, [id, hex]) => ({ ...acc, [hex.toLowerCase()]: id }), {});

// Initialize OAuth2 Client using process.env
const getOAuthClient = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
};

// 1. Generate Google Auth URL
export const getGoogleAuthURL = onCall({ cors: true }, async (request) => {
    const oauth2Client = getOAuthClient();
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    // Encode state with UID and Origin
    const stateData = {
        uid: request.auth?.uid,
        origin: request.data?.origin
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: state
    });

    return { url };
});

// 1.5 Health Check (Diagnostic)
export const healthCheck = onRequest({ cors: true }, (req, res) => {
    res.status(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        config: {
            hasClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
            redirectUri: process.env.GOOGLE_REDIRECT_URI,
            appUrl: process.env.APP_URL
        }
    });
});

// 2. Handle Google Callback (Redirect URI)
export const handleGoogleCallback = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        console.info('--- STARTING AUTH FLOW ---');

        // 1. Strict Config Validation
        const missingEnv = [];
        if (!process.env.GOOGLE_CLIENT_ID) missingEnv.push('GOOGLE_CLIENT_ID');
        if (!process.env.GOOGLE_CLIENT_SECRET) missingEnv.push('GOOGLE_CLIENT_SECRET');
        if (!process.env.GOOGLE_REDIRECT_URI) missingEnv.push('GOOGLE_REDIRECT_URI');

        if (missingEnv.length > 0) {
            const msg = `Configuration Error: Missing environment variables: ${missingEnv.join(', ')}`;
            console.error(msg);
            res.status(500).send(msg);
            return;
        }

        const code = req.query.code as string;
        const state = req.query.state as string;

        if (!code) {
            console.error('Missing auth code in callback');
            res.status(400).send("Missing auth code");
            return;
        }

        const oauth2Client = getOAuthClient();
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.access_token) {
            res.status(500).send("No access token returned from Google");
            return;
        }

        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;

        if (!email) {
            res.status(500).send("Could not retrieve email from Google Account");
            return;
        }

        let userId: string | undefined;
        let origin: string | undefined;

        try {
            if (state) {
                const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
                userId = decoded.uid;
                origin = decoded.origin;
            }
        } catch (e) {
            console.warn('Failed to parse state, falling back to raw state as uid', e);
            userId = state;
        }

        if (!userId) {
            res.status(400).send("Missing user state identifier (uid)");
            return;
        }

        const db = admin.firestore();
        await db.collection('users').doc(userId).collection('connected_calendars').doc(email).set({
            refreshToken: tokens.refresh_token || null,
            accessToken: tokens.access_token,
            expiryDate: tokens.expiry_date,
            syncToken: null,
            calendarEmail: email,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Register Webhook - AWAIT this to ensure it happens before function termination
        console.info(`Registering webhook for ${email}`);
        try {
            await registerWebhookWatch(userId, email, tokens.access_token, tokens.refresh_token);
        } catch (e) {
            console.error('Initial webhook registration failed', e);
            // Non-fatal, frontend will trigger full sync anyway
        }

        // REMOVED: performCalendarSync(userId, email) 
        // We now rely on the frontend to trigger 'triggerFullResync' via checking ?new_connection=true
        // This avoids the issue where this background process gets killed by Cloud Functions.

        console.info('--- AUTH FLOW COMPLETE, REDIRECTING ---');
        const appUrl = origin || process.env.APP_URL || 'http://localhost:5173';
        // Add new_connection flag so frontend knows to trigger the robust full sync
        res.redirect(`${appUrl}/settings?success=true&new_connection=true`);

    } catch (error: any) {
        console.error("Critical Callback Error:", error);
        res.status(500).send(`CRITICAL FAILURE: ${error.message || error} \nStack: ${error.stack || 'none'}`);
    }
});

// Helper Functions
const toDate = (val: any): Date | null => {
    if (!val) return null;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof admin.firestore.Timestamp) return val.toDate();
    return new Date(val);
};


// Helper to parse RRULE strings into our internal format
function parseRecurrence(recurrence: string[] | null | undefined): any {
    if (!recurrence || recurrence.length === 0) return null;

    try {
        const ruleStr = recurrence.find(r => r.startsWith('RRULE:'));
        if (!ruleStr) return null;

        const cleanRule = ruleStr.replace(/^RRULE:/, '');

        // Simple regex-based parsing as fallback since ical.js has issues in Cloud Functions
        const parts: Record<string, string> = {};
        cleanRule.split(';').forEach((part) => {
            const [key, value] = part.split('=');
            if (key && value) parts[key] = value;
        });

        if (!parts.FREQ) return null;

        const result: any = {
            frequency: parts.FREQ.toLowerCase(),
            interval: parts.INTERVAL ? parseInt(parts.INTERVAL) : 1,
            count: parts.COUNT ? parseInt(parts.COUNT) : null,
        };

        // Parse UNTIL (end date)
        if (parts.UNTIL) {
            // Format: 20250101T060000Z or 20250101
            const until = parts.UNTIL;
            if (until.length >= 8) {
                const year = until.slice(0, 4);
                const month = until.slice(4, 6);
                const day = until.slice(6, 8);
                let isoDate = `${year}-${month}-${day}`;
                if (until.length >= 15) {
                    const hour = until.slice(9, 11);
                    const minute = until.slice(11, 13);
                    const second = until.slice(13, 15);
                    isoDate = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
                } else {
                    isoDate += 'T23:59:59Z';
                }
                result.endDate = isoDate;
            }
        }

        // Parse BYDAY (e.g., "MO,WE,FR" or "2SU" for 2nd Sunday)
        if (parts.BYDAY) {
            const dayMap: Record<string, number> = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };
            const days = parts.BYDAY.split(',')
                .map((d: string) => {
                    // Strip any numeric prefix (e.g., "2SU" -> "SU")
                    const dayCode = d.replace(/^-?\d+/, '');
                    return dayMap[dayCode];
                })
                .filter((n: number | undefined): n is number => n !== undefined);
            if (days.length > 0) {
                result.byDay = days;
            }
        }

        // Parse BYMONTHDAY
        if (parts.BYMONTHDAY) {
            result.byMonthDay = parseInt(parts.BYMONTHDAY);
        }

        // Parse BYMONTH (1-12 in RRULE, we store as 0-11)
        if (parts.BYMONTH) {
            result.byMonth = parseInt(parts.BYMONTH) - 1;
        }

        return result;

    } catch (e) {
        console.warn('Failed to parse recurrence rule:', recurrence, e);
        return null;
    }
}

const performCalendarSync = async (userId: string, calendarEmail: string, fullSync: boolean = false): Promise<void> => {
    const db = admin.firestore();
    const calendarRef = db.collection('users').doc(userId).collection('connected_calendars').doc(calendarEmail);
    const calendarDoc = await calendarRef.get();

    if (!calendarDoc.exists) return;

    const { accessToken, refreshToken, syncToken } = calendarDoc.data() || {};
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const listEvents = async (useSyncToken: string | null, pageToken: string | null = null) => {
        const params: any = {
            calendarId: 'primary',
            singleEvents: false, // Changed to FALSE to retrieve Master + Exception events
            maxResults: 500,
            pageToken: pageToken || undefined
        };

        if (fullSync) {
            // For full sync of master events, we typically don't set strict time bounds 
            // because a master event could have started years ago but still be active.
            // Google recommends NOT setting timeMin for syncs if possible, or setting it very far back.
            // However, to keep it sane, let's look back 5 years.
            const past = new Date();
            past.setFullYear(past.getFullYear() - 5);
            params.timeMin = past.toISOString();
        } else if (useSyncToken) {
            params.syncToken = useSyncToken;
            params.showDeleted = true;
        } else {
            const past = new Date();
            past.setFullYear(past.getFullYear() - 1);
            params.timeMin = past.toISOString();
        }
        return await calendar.events.list(params);
    };

    let events: any[] = [];
    let nextSyncToken = null;

    try {
        console.info(`Starting sync for ${calendarEmail}, fullSync: ${fullSync}`);
        let currentPageToken = null;
        let isFirstPage = true;

        do {
            let response: any;
            if (!fullSync && syncToken && isFirstPage) {
                try {
                    response = await listEvents(syncToken, currentPageToken);
                } catch (err: any) {
                    if (err.code === 410) {
                        console.warn(`Sync token expired, performing full sync.`);
                        return performCalendarSync(userId, calendarEmail, true);
                    } else {
                        throw err;
                    }
                }
            } else {
                response = await listEvents(null, currentPageToken);
            }

            const items = response.data.items || [];
            events = events.concat(items);
            currentPageToken = response.data.nextPageToken;
            nextSyncToken = response.data.nextSyncToken;
            isFirstPage = false;
        } while (currentPageToken);

        console.info(`Total events fetched: ${events.length}`);

        if (nextSyncToken) {
            await calendarRef.update({
                syncToken: nextSyncToken,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        let batch = db.batch();
        let operationCount = 0;
        const eventsCol = db.collection('users').doc(userId).collection('tasks');
        const googleEventIds = new Set<string>();

        const commitBatchIfNeeded = async () => {
            // 400 writes limit per batch for safety
            if (operationCount >= 400) {
                console.info(`Committing batch checkpoint (${operationCount} ops)...`);
                await batch.commit();
                batch = db.batch(); // Reset batch
                operationCount = 0;
            }
        };

        for (const ev of events) {
            googleEventIds.add(ev.id);
            if (ev.status === 'cancelled') {
                const querySnap = await eventsCol.where('googleEventId', '==', ev.id).limit(1).get();
                if (!querySnap.empty) {
                    batch.delete(querySnap.docs[0].ref);
                    operationCount++;
                }
                await commitBatchIfNeeded();
                continue;
            }

            const querySnap = await eventsCol.where('googleEventId', '==', ev.id).limit(1).get();
            const start = ev.start?.dateTime || ev.start?.date;
            const end = ev.end?.dateTime || ev.end?.date;

            // Parse Recurrence (Safe Mode)
            let recurrence = null;
            try {
                recurrence = parseRecurrence(ev.recurrence);
            } catch (err) {
                console.warn(`Failed to parse recurrence for ${ev.id}`, err);
            }

            const eventData: any = {
                title: ev.summary || '(No Title)',
                scheduledStart: start,
                scheduledEnd: end,
                dueAt: end,
                isAllDay: !!ev.start?.date,
                notes: ev.description || '',
                color: ev.colorId ? GOOGLE_COLOR_MAP[ev.colorId] || null : null,
                googleEventId: ev.id,
                calendarEmail: calendarEmail,
                recurrence: recurrence,
                recurringEventId: ev.recurringEventId || null,
                originalStart: ev.originalStartTime ? (ev.originalStartTime.dateTime || ev.originalStartTime.date) : null,
                isRecurringInstance: !!ev.recurringEventId, // It's an exception if it has a parent ID
                isModified: !!ev.recurringEventId, // Exceptions are implicitly modified
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (!querySnap.empty) {
                batch.update(querySnap.docs[0].ref, eventData);
            } else {
                const newDoc = eventsCol.doc();
                batch.set(newDoc, {
                    ...eventData,
                    ownerUid: userId,
                    status: 'todo',
                    priority: 'medium',
                    assignedTo: [userId],
                    sharedWith: [],
                    contactIds: [],
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            operationCount++;
            await commitBatchIfNeeded();
        }

        if (fullSync) {
            // In a full sync, we must be careful. 
            // If we are switching from "expanded" (singleEvents: true) to "master" (singleEvents: false),
            // the old text-based "Testttttttt" duplicates are gone, 
            // BUT strict cleanup validation is needed.
            // We should NOT auto-delete everything not in the list unless we are sure.
            // However, with `singleEvents: false`, we *expect* fewer events.
            // Any event in DB that has this `calendarEmail` but is NOT in `googleEventIds` 
            // implies it was deleted from Google OR it was an old 'expanded' instance.
            // Safest bet for the transition is to delete them.

            const allSnap = await eventsCol.where('calendarEmail', '==', calendarEmail).get();
            for (const doc of allSnap.docs) {
                const gid = doc.data().googleEventId;
                if (gid && !googleEventIds.has(gid)) {
                    batch.delete(doc.ref);
                    operationCount++;
                    await commitBatchIfNeeded();
                }
            }
        }

        if (operationCount > 0) {
            await batch.commit();
        }

    } catch (error: any) {
        console.error(`SYNC ERROR for ${calendarEmail}:`, error.message || error);
    }
};

// 3. Sync Calendar Events (Incremental)
export const syncCalendarEvents = onCall({ cors: true }, async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'User must be signed in');

    const targetEmail = request.data.calendarEmail;
    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');

    let calendarDoc;
    if (targetEmail) {
        calendarDoc = await calendarsRef.doc(targetEmail).get();
    } else {
        const snapshot = await calendarsRef.limit(1).get();
        if (snapshot.empty) throw new HttpsError('not-found', 'No connected calendars found');
        calendarDoc = snapshot.docs[0];
    }

    if (!calendarDoc.exists) throw new HttpsError('not-found', 'Calendar connection not found');
    const data = calendarDoc.data();
    const { calendarEmail } = data || {};

    // Trigger sync reuse logic
    await performCalendarSync(userId, calendarEmail);
    return { success: true };
});
// Part 1: App -> Google (Export)
export const exportToGoogle = onDocumentWritten('users/{userId}/tasks/{taskId}', async (event) => {
    const change = event.data;
    if (!change) return;

    const userId = event.params.userId;
    const db = admin.firestore();

    const isDelete = !change.after.exists;
    const isCreate = !change.before.exists;
    const beforeData = change.before.exists ? change.before.data() : null;
    const data = (change.after.exists ? change.after.data() : change.before.data()) || {};

    // LOOP PREVENTION: Skip if this event originated from Google Calendar sync
    // Events synced from Google will have a calendarEmail field
    if (data.calendarEmail && !isDelete) {
        // Check if this is just an update from sync (not a deliberate user edit)
        // If the before data also had calendarEmail and key fields haven't changed, skip
        if (beforeData?.calendarEmail) {
            const titleSame = beforeData.title === data.title;
            const startSame = String(beforeData.scheduledStart) === String(data.scheduledStart);
            const endSame = String(beforeData.scheduledEnd) === String(data.scheduledEnd);
            const notesSame = beforeData.notes === data.notes;
            const colorSame = beforeData.color === data.color;

            // If nothing important changed, this was likely just a sync update
            if (titleSame && startSame && endSame && notesSame && colorSame) {
                console.info('Skipping export: no user-facing changes detected (likely sync update)');
                return;
            }
        } else if (isCreate) {
            // New document with calendarEmail means it came from sync - don't re-export
            console.info('Skipping export: new event came from Google sync');
            return;
        }
    }

    // LOOP PREVENTION: Skip if only change was adding googleEventId (from our own export)
    if (!isCreate && !isDelete && beforeData && !beforeData.googleEventId && data.googleEventId) {
        const beforeKeys = Object.keys(beforeData).filter(k => k !== 'googleEventId' && k !== 'updatedAt');
        const afterKeys = Object.keys(data).filter(k => k !== 'googleEventId' && k !== 'updatedAt');
        if (beforeKeys.length === afterKeys.length) {
            console.info('Skipping export: only googleEventId was added');
            return;
        }
    }

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
            const startVal = toDate(data.scheduledStart || data.startTime);
            const endVal = toDate(data.scheduledEnd || data.endTime);

            if (!startVal || !endVal) return;

            const resource = {
                summary: data.title,
                description: data.notes,
                start: { dateTime: startVal.toISOString() },
                end: { dateTime: endVal.toISOString() },
                colorId: data.color ? HEX_TO_GOOGLE_COLOR_MAP[data.color.toLowerCase()] : undefined
            };

            if (isCreate || !data.googleEventId) {
                const res = await calendar.events.insert({ calendarId: 'primary', requestBody: resource });
                await change.after.ref.update({ googleEventId: res.data.id });
            } else {
                await calendar.events.update({ calendarId: 'primary', eventId: data.googleEventId, requestBody: resource });
            }
        }
    } catch (err) {
        console.error('Export failed', err);
    }
});

// Register Webhook Helper
const registerWebhookWatch = async (userId: string, calendarEmail: string, accessToken: any, refreshToken: any) => {
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
            address: functionUrl
        }
    });

    const db = admin.firestore();
    await db.collection('users').doc(userId).collection('connected_calendars').doc(calendarEmail).update({
        webhookChannelId: channelId,
        webhookResourceId: res.data.resourceId,
        webhookExpiration: res.data.expiration,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.info(`Triggering initial sync for ${calendarEmail} (background)`);
    performCalendarSync(userId, calendarEmail).catch(e => {
        console.error('Initial background sync failed', e);
    });

    return { channelId, expiration: res.data.expiration };
};

export const startWebhookWatch = onCall({ cors: true, invoker: 'public' }, async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'User must be signed in');

    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');
    const snapshot = await calendarsRef.limit(1).get();
    if (snapshot.empty) throw new HttpsError('not-found', 'No calendar');
    const { accessToken, refreshToken, calendarEmail } = snapshot.docs[0].data();

    try {
        const result = await registerWebhookWatch(userId, calendarEmail, accessToken, refreshToken);
        return { success: true, ...result };
    } catch (error: any) {
        console.error('Failed to start watch', error);
        // Expose the real error message to the client
        const msg = error.message || 'Unknown error';
        const details = error.response?.data || {};
        throw new HttpsError('unknown', `GCal API: ${msg}`, details);
    }
});

export const handleCalendarWebhook = onRequest(async (req, res) => {
    const state = req.headers['x-goog-resource-state'];
    const channelId = req.headers['x-goog-channel-id'] as string;

    if (state === 'sync') {
        res.status(200).send('Sync OK');
        return;
    }

    if (state === 'exists') {
        const db = admin.firestore();
        const query = await db.collectionGroup('connected_calendars')
            .where('webhookChannelId', '==', channelId)
            .limit(1)
            .get();

        if (query.empty) {
            res.status(404).send('Channel not found');
            return;
        }

        const doc = query.docs[0];
        const data = doc.data();
        const userId = doc.ref.parent.parent!.id;
        const { calendarEmail, lastSyncAt } = data;

        // DEBOUNCE: Skip if last sync was less than 5 seconds ago
        const DEBOUNCE_MS = 5000;
        const now = Date.now();
        if (lastSyncAt) {
            const lastSyncTime = typeof lastSyncAt.toMillis === 'function'
                ? lastSyncAt.toMillis()
                : new Date(lastSyncAt).getTime();
            if (now - lastSyncTime < DEBOUNCE_MS) {
                console.info(`Debouncing sync for ${calendarEmail}, last sync was ${now - lastSyncTime}ms ago`);
                res.status(200).send('Debounced');
                return;
            }
        }

        // Update lastSyncAt before starting sync to prevent parallel syncs
        await doc.ref.update({ lastSyncAt: admin.firestore.FieldValue.serverTimestamp() });

        await performCalendarSync(userId, calendarEmail);
    }
    res.status(200).send('OK');
});

export const renewWebhookWatch = onSchedule("every 24 hours", async (event) => {
    const db = admin.firestore();
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const snapshot = await db.collectionGroup('connected_calendars')
        .orderBy('webhookExpiration')
        .get();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.webhookChannelId || !data.webhookExpiration) continue;

        const exp = parseInt(data.webhookExpiration);
        if (exp - now < ONE_DAY_MS) {
            console.log(`Renewing webhook for ${doc.id}`);
            const { accessToken, refreshToken } = data;
            const oauth2Client = getOAuthClient();
            oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            try {
                await calendar.channels.stop({
                    requestBody: {
                        id: data.webhookChannelId,
                        resourceId: data.webhookResourceId
                    }
                });
            } catch (e) { }

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

export const simulateWebhookEvent = onCall({ cors: true }, async (request) => {
    const userId = request.auth?.uid;
    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId!).collection('connected_calendars');

    const snapshot = await calendarsRef.limit(1).get();
    if (snapshot.empty) throw new HttpsError('not-found', 'No connected calendar');
    const { calendarEmail } = snapshot.docs[0].data();

    await performCalendarSync(userId!, calendarEmail);
    return { success: true, message: 'Sync simulated' };
});

export const triggerFullResync = onCall({
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 540
}, async (request) => {
    const userId = request.auth?.uid;
    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId!).collection('connected_calendars');

    const snapshot = await calendarsRef.get();
    const results: string[] = [];

    for (const doc of snapshot.docs) {
        const calendarEmail = doc.id;
        await doc.ref.update({ syncToken: null });
        await performCalendarSync(userId!, calendarEmail, true);
        results.push(calendarEmail);
    }


    return { success: true, message: `Full re-sync completed for: ${results.join(', ')}` };
});
