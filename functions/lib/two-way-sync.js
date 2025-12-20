"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renewWebhookWatch = exports.handleCalendarWebhook = exports.startWebhookWatch = exports.exportToGoogle = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const uuid_1 = require("uuid");
// SHARED HELPER: Sync Logic (extracted for reuse)
// Returns Promise<void>
const performCalendarSync = async (userId, calendarEmail) => {
    var _a, _b, _c, _d;
    const db = admin.firestore();
    const calendarRef = db.collection('users').doc(userId).collection('connected_calendars').doc(calendarEmail);
    const calendarDoc = await calendarRef.get();
    if (!calendarDoc.exists)
        return;
    const { accessToken, refreshToken, syncToken } = calendarDoc.data() || {};
    // Setup OAuth
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    // Helper: list events
    const listEvents = async (useSyncToken) => {
        const params = { calendarId: 'primary', singleEvents: true };
        if (useSyncToken) {
            params.syncToken = useSyncToken;
        }
        else {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            params.timeMin = thirtyDaysAgo.toISOString();
        }
        return await calendar.events.list(params);
    };
    let events = [];
    let nextSyncToken = null;
    try {
        let response;
        if (syncToken) {
            try {
                response = await listEvents(syncToken);
            }
            catch (err) {
                if (err.code === 410) {
                    console.warn(`Sync token expired for ${calendarEmail}, full sync.`);
                    response = await listEvents(null);
                }
                else
                    throw err;
            }
        }
        else {
            response = await listEvents(null);
        }
        events = response.data.items || [];
        nextSyncToken = response.data.nextSyncToken;
        // Save Token
        await calendarRef.update({
            syncToken: nextSyncToken || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Upsert Events to Firestore
        // Note: Logic to save events to 'users/{uid}/events' (or tasks)
        // User asked to "Trigger a sync... to fetch only changed events".
        // Presuming we need to saving them to Firestore similar to how the app works.
        // For this snippet, I will just log the count, as the specific "Save to Firestore" logic was in Part 1 (createGoogleEvent) essentially reversed.
        // But for "Google -> App", we need to write to DB.
        // I will assume simple writing to 'events' collection matching the schema.
        const batch = db.batch();
        const eventsCol = db.collection('users').doc(userId).collection('events');
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
            const eventData = {
                title: ev.summary || '(No Title)',
                startTime: ((_a = ev.start) === null || _a === void 0 ? void 0 : _a.dateTime) || ((_b = ev.start) === null || _b === void 0 ? void 0 : _b.date),
                endTime: ((_c = ev.end) === null || _c === void 0 ? void 0 : _c.dateTime) || ((_d = ev.end) === null || _d === void 0 ? void 0 : _d.date),
                notes: ev.description || '',
                googleEventId: ev.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (!querySnap.empty) {
                batch.update(querySnap.docs[0].ref, eventData);
            }
            else {
                const newDoc = eventsCol.doc();
                batch.set(newDoc, Object.assign(Object.assign({}, eventData), { ownerUid: userId, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
            }
        }
        await batch.commit();
    }
    catch (error) {
        console.error('Sync error', error);
    }
};
// Part 1: App -> Google (Export)
// Replaces createGoogleEvent with full export (Create/Update)
exports.exportToGoogle = (0, firestore_1.onDocumentWritten)('users/{userId}/events/{eventId}', async (event) => {
    const change = event.data;
    if (!change)
        return; // Error
    const userId = event.params.userId;
    const db = admin.firestore();
    // Determine Type
    const isDelete = !change.after.exists;
    const isCreate = !change.before.exists;
    const data = (change.after.exists ? change.after.data() : change.before.data()) || {};
    // 1. Get Credentials
    // Optimization: Store a "primaryconnected" flag or just grab first
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');
    const calendarSnap = await calendarsRef.limit(1).get();
    if (calendarSnap.empty)
        return;
    const { accessToken, refreshToken } = calendarSnap.docs[0].data();
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    try {
        if (isDelete) {
            if (data.googleEventId) {
                await calendar.events.delete({ calendarId: 'primary', eventId: data.googleEventId });
            }
        }
        else {
            // Create or Update
            const resource = {
                summary: data.title,
                description: data.notes,
                start: { dateTime: new Date(data.startTime || data.scheduledStart).toISOString() },
                end: { dateTime: new Date(data.endTime || data.scheduledEnd).toISOString() }
            };
            if (isCreate || !data.googleEventId) {
                if (data.googleEventId)
                    return; // Already exists?
                const res = await calendar.events.insert({ calendarId: 'primary', requestBody: resource });
                await change.after.ref.update({ googleEventId: res.data.id });
            }
            else {
                // Update
                await calendar.events.update({ calendarId: 'primary', eventId: data.googleEventId, requestBody: resource });
            }
        }
    }
    catch (err) {
        console.error('Export failed', err);
    }
});
// Part 2: Google -> App (Webhook)
// 1. Start Watch (Callable)
exports.startWebhookWatch = onCall({ cors: true }, async (request) => {
    var _a, _b;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId)
        throw new HttpsError('unauthenticated', 'User must be signed in');
    // Optional: Accept calendarEmail
    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');
    const snapshot = await calendarsRef.limit(1).get();
    if (snapshot.empty)
        throw new HttpsError('not-found', 'No calendar');
    const calendarDoc = snapshot.docs[0];
    const { accessToken, refreshToken, calendarEmail } = calendarDoc.data();
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const channelId = (0, uuid_1.v4)();
    const webhookUrl = `${process.env.APP_URL}/handleCalendarWebhook`; // Use the explicit URL if APP_URL is hosting, OR build functions URL
    // Actually, APP_URL in .env was for frontend redirect.
    // The webhook URL must be the FUNCTION URL: https://region-project.cloudfunctions.net/handleCalendarWebhook
    // Helper to get project ID
    const projectId = ((_b = admin.instanceId().app.options.credential) === null || _b === void 0 ? void 0 : _b.projectId) || process.env.GCLOUD_PROJECT;
    const region = 'us-central1'; // Hardcoded for now or use env
    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/handleCalendarWebhook`;
    const res = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
            id: channelId,
            type: 'web_hook',
            address: functionUrl,
            // expiration: 604800000 // 7 days (ms) - Google default is ~1 month or 1 week
        }
    });
    await calendarDoc.ref.update({
        webhookChannelId: channelId,
        webhookResourceId: res.data.resourceId,
        webhookExpiration: res.data.expiration,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, channelId, expiration: res.data.expiration };
});
// 2. Handle Webhook (HTTP)
exports.handleCalendarWebhook = onRequest(async (req, res) => {
    const state = req.headers['x-goog-resource-state'];
    const channelId = req.headers['x-goog-channel-id'];
    const resourceId = req.headers['x-goog-resource-id'];
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
        const userId = doc.ref.parent.parent.id;
        const { calendarEmail } = doc.data();
        await performCalendarSync(userId, calendarEmail);
    }
    res.status(200).send('OK');
});
// Part 3: Maintenance (Renewal Cron)
// Runs every 24 hours
exports.renewWebhookWatch = (0, scheduler_1.onSchedule)("every 24 hours", async (event) => {
    var _a;
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
        if (!data.webhookChannelId || !data.webhookExpiration)
            continue;
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
            }
            catch (e) { /* Ignore if already stopped */ }
            // Start new
            const projectId = ((_a = admin.instanceId().app.options.credential) === null || _a === void 0 ? void 0 : _a.projectId) || process.env.GCLOUD_PROJECT;
            const region = 'us-central1';
            const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/handleCalendarWebhook`;
            const newChannelId = (0, uuid_1.v4)();
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
//# sourceMappingURL=two-way-sync.js.map