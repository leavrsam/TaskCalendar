"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerFullResync = exports.simulateWebhookEvent = exports.renewWebhookWatch = exports.handleCalendarWebhook = exports.startWebhookWatch = exports.exportToGoogle = exports.syncCalendarEvents = exports.handleGoogleCallback = exports.healthCheck = exports.getGoogleAuthURL = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
const uuid_1 = require("uuid");
admin.initializeApp();
// Google Calendar colorId to hex mapping
const GOOGLE_COLOR_MAP = {
    '1': '#7986cb',
    '2': '#33b679',
    '3': '#8e24aa',
    '4': '#e67c73',
    '5': '#f6bf26',
    '6': '#f4511e',
    '7': '#039be5',
    '8': '#616161',
    '9': '#3f51b5',
    '10': '#0b8043',
    '11': '#d50000', // Tomato
};
// Reverse map for lookup (Hex -> Google ID)
const HEX_TO_GOOGLE_COLOR_MAP = Object.entries(GOOGLE_COLOR_MAP)
    .reduce((acc, [id, hex]) => (Object.assign(Object.assign({}, acc), { [hex.toLowerCase()]: id })), {});
// Initialize OAuth2 Client using process.env
const getOAuthClient = () => {
    return new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
};
// 1. Generate Google Auth URL
exports.getGoogleAuthURL = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    const oauth2Client = getOAuthClient();
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email'
    ];
    // Encode state with UID and Origin
    const stateData = {
        uid: (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid,
        origin: (_b = request.data) === null || _b === void 0 ? void 0 : _b.origin
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
exports.healthCheck = (0, https_1.onRequest)({ cors: true }, (req, res) => {
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
exports.handleGoogleCallback = (0, https_1.onRequest)({ cors: true, invoker: 'public' }, async (req, res) => {
    try {
        console.info('--- STARTING AUTH FLOW ---');
        // 1. Strict Config Validation
        const missingEnv = [];
        if (!process.env.GOOGLE_CLIENT_ID)
            missingEnv.push('GOOGLE_CLIENT_ID');
        if (!process.env.GOOGLE_CLIENT_SECRET)
            missingEnv.push('GOOGLE_CLIENT_SECRET');
        if (!process.env.GOOGLE_REDIRECT_URI)
            missingEnv.push('GOOGLE_REDIRECT_URI');
        if (missingEnv.length > 0) {
            const msg = `Configuration Error: Missing environment variables: ${missingEnv.join(', ')}`;
            console.error(msg);
            res.status(500).send(msg);
            return;
        }
        const code = req.query.code;
        const state = req.query.state;
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
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;
        if (!email) {
            res.status(500).send("Could not retrieve email from Google Account");
            return;
        }
        let userId;
        let origin;
        try {
            if (state) {
                const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
                userId = decoded.uid;
                origin = decoded.origin;
            }
        }
        catch (e) {
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
        // Immediate Initial Sync - Fire and Forget
        console.info(`Triggering initial sync for ${email} (background)`);
        performCalendarSync(userId, email).catch(e => {
            console.error('Initial background sync failed', e);
        });
        // Register Webhook - Fire and Forget
        console.info(`Registering webhook for ${email} (background)`);
        registerWebhookWatch(userId, email, tokens.access_token, tokens.refresh_token).catch(e => {
            console.error('Initial webhook registration failed', e);
        });
        console.info('--- AUTH FLOW COMPLETE, REDIRECTING ---');
        const appUrl = origin || process.env.APP_URL || 'http://localhost:5173';
        res.redirect(`${appUrl}/settings?success=true`);
    }
    catch (error) {
        console.error("Critical Callback Error:", error);
        res.status(500).send(`CRITICAL FAILURE: ${error.message || error} \nStack: ${error.stack || 'none'}`);
    }
});
// Helper Functions
const toDate = (val) => {
    if (!val)
        return null;
    if (val.toDate && typeof val.toDate === 'function')
        return val.toDate();
    if (val instanceof admin.firestore.Timestamp)
        return val.toDate();
    return new Date(val);
};
const performCalendarSync = async (userId, calendarEmail, fullSync = false) => {
    var _a, _b, _c, _d, _e;
    const db = admin.firestore();
    const calendarRef = db.collection('users').doc(userId).collection('connected_calendars').doc(calendarEmail);
    const calendarDoc = await calendarRef.get();
    if (!calendarDoc.exists)
        return;
    const { accessToken, refreshToken, syncToken } = calendarDoc.data() || {};
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    const listEvents = async (useSyncToken, pageToken = null) => {
        const params = {
            calendarId: 'primary',
            singleEvents: true,
            maxResults: 500,
            pageToken: pageToken || undefined
        };
        if (fullSync) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            params.timeMin = thirtyDaysAgo.toISOString();
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            params.timeMax = oneYearFromNow.toISOString();
        }
        else if (useSyncToken) {
            params.syncToken = useSyncToken;
            params.showDeleted = true;
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
        console.info(`Starting sync for ${calendarEmail}, fullSync: ${fullSync}`);
        let currentPageToken = null;
        let isFirstPage = true;
        do {
            let response;
            if (!fullSync && syncToken && isFirstPage) {
                try {
                    response = await listEvents(syncToken, currentPageToken);
                }
                catch (err) {
                    if (err.code === 410) {
                        console.warn(`Sync token expired, performing full sync.`);
                        return performCalendarSync(userId, calendarEmail, true);
                    }
                    else {
                        throw err;
                    }
                }
            }
            else {
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
        const batch = db.batch();
        const eventsCol = db.collection('users').doc(userId).collection('tasks');
        const googleEventIds = new Set();
        for (const ev of events) {
            googleEventIds.add(ev.id);
            if (ev.status === 'cancelled') {
                const querySnap = await eventsCol.where('googleEventId', '==', ev.id).limit(1).get();
                if (!querySnap.empty) {
                    batch.delete(querySnap.docs[0].ref);
                }
                continue;
            }
            const querySnap = await eventsCol.where('googleEventId', '==', ev.id).limit(1).get();
            const start = ((_a = ev.start) === null || _a === void 0 ? void 0 : _a.dateTime) || ((_b = ev.start) === null || _b === void 0 ? void 0 : _b.date);
            const end = ((_c = ev.end) === null || _c === void 0 ? void 0 : _c.dateTime) || ((_d = ev.end) === null || _d === void 0 ? void 0 : _d.date);
            const eventData = {
                title: ev.summary || '(No Title)',
                scheduledStart: start,
                scheduledEnd: end,
                dueAt: end,
                isAllDay: !!((_e = ev.start) === null || _e === void 0 ? void 0 : _e.date),
                notes: ev.description || '',
                color: ev.colorId ? GOOGLE_COLOR_MAP[ev.colorId] || null : null,
                googleEventId: ev.id,
                calendarEmail: calendarEmail,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (!querySnap.empty) {
                batch.update(querySnap.docs[0].ref, eventData);
            }
            else {
                const newDoc = eventsCol.doc();
                batch.set(newDoc, Object.assign(Object.assign({}, eventData), { ownerUid: userId, status: 'todo', priority: 'medium', assignedTo: [userId], sharedWith: [], contactIds: [], recurrence: null, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
            }
        }
        if (fullSync) {
            const allSnap = await eventsCol.where('calendarEmail', '==', calendarEmail).get();
            for (const doc of allSnap.docs) {
                const gid = doc.data().googleEventId;
                if (gid && !googleEventIds.has(gid)) {
                    batch.delete(doc.ref);
                }
            }
        }
        await batch.commit();
    }
    catch (error) {
        console.error(`SYNC ERROR for ${calendarEmail}:`, error.message || error);
    }
};
// 3. Sync Calendar Events (Incremental)
exports.syncCalendarEvents = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId)
        throw new https_1.HttpsError('unauthenticated', 'User must be signed in');
    const targetEmail = request.data.calendarEmail;
    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');
    let calendarDoc;
    if (targetEmail) {
        calendarDoc = await calendarsRef.doc(targetEmail).get();
    }
    else {
        const snapshot = await calendarsRef.limit(1).get();
        if (snapshot.empty)
            throw new https_1.HttpsError('not-found', 'No connected calendars found');
        calendarDoc = snapshot.docs[0];
    }
    if (!calendarDoc.exists)
        throw new https_1.HttpsError('not-found', 'Calendar connection not found');
    const data = calendarDoc.data();
    const { calendarEmail } = data || {};
    // Trigger sync reuse logic
    await performCalendarSync(userId, calendarEmail);
    return { success: true };
});
// Part 1: App -> Google (Export)
exports.exportToGoogle = (0, firestore_1.onDocumentWritten)('users/{userId}/tasks/{taskId}', async (event) => {
    const change = event.data;
    if (!change)
        return;
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
        if (beforeData === null || beforeData === void 0 ? void 0 : beforeData.calendarEmail) {
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
        }
        else if (isCreate) {
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
    if (calendarSnap.empty)
        return;
    const { accessToken, refreshToken } = calendarSnap.docs[0].data();
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    try {
        if (isDelete) {
            if (data.googleEventId) {
                await calendar.events.delete({ calendarId: 'primary', eventId: data.googleEventId });
            }
        }
        else {
            const startVal = toDate(data.scheduledStart || data.startTime);
            const endVal = toDate(data.scheduledEnd || data.endTime);
            if (!startVal || !endVal)
                return;
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
            }
            else {
                await calendar.events.update({ calendarId: 'primary', eventId: data.googleEventId, requestBody: resource });
            }
        }
    }
    catch (err) {
        console.error('Export failed', err);
    }
});
// Register Webhook Helper
const registerWebhookWatch = async (userId, calendarEmail, accessToken, refreshToken) => {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    const channelId = (0, uuid_1.v4)();
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
exports.startWebhookWatch = (0, https_1.onCall)({ cors: true, invoker: 'public' }, async (request) => {
    var _a, _b;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId)
        throw new https_1.HttpsError('unauthenticated', 'User must be signed in');
    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');
    const snapshot = await calendarsRef.limit(1).get();
    if (snapshot.empty)
        throw new https_1.HttpsError('not-found', 'No calendar');
    const { accessToken, refreshToken, calendarEmail } = snapshot.docs[0].data();
    try {
        const result = await registerWebhookWatch(userId, calendarEmail, accessToken, refreshToken);
        return Object.assign({ success: true }, result);
    }
    catch (error) {
        console.error('Failed to start watch', error);
        // Expose the real error message to the client
        const msg = error.message || 'Unknown error';
        const details = ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || {};
        throw new https_1.HttpsError('unknown', `GCal API: ${msg}`, details);
    }
});
exports.handleCalendarWebhook = (0, https_1.onRequest)(async (req, res) => {
    const state = req.headers['x-goog-resource-state'];
    const channelId = req.headers['x-goog-channel-id'];
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
        const userId = doc.ref.parent.parent.id;
        const { calendarEmail } = doc.data();
        await performCalendarSync(userId, calendarEmail);
    }
    res.status(200).send('OK');
});
exports.renewWebhookWatch = (0, scheduler_1.onSchedule)("every 24 hours", async (event) => {
    const db = admin.firestore();
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const snapshot = await db.collectionGroup('connected_calendars')
        .orderBy('webhookExpiration')
        .get();
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.webhookChannelId || !data.webhookExpiration)
            continue;
        const exp = parseInt(data.webhookExpiration);
        if (exp - now < ONE_DAY_MS) {
            console.log(`Renewing webhook for ${doc.id}`);
            const { accessToken, refreshToken } = data;
            const oauth2Client = getOAuthClient();
            oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
            try {
                await calendar.channels.stop({
                    requestBody: {
                        id: data.webhookChannelId,
                        resourceId: data.webhookResourceId
                    }
                });
            }
            catch (e) { }
            const projectId = process.env.GCLOUD_PROJECT;
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
exports.simulateWebhookEvent = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');
    const snapshot = await calendarsRef.limit(1).get();
    if (snapshot.empty)
        throw new https_1.HttpsError('not-found', 'No connected calendar');
    const { calendarEmail } = snapshot.docs[0].data();
    await performCalendarSync(userId, calendarEmail);
    return { success: true, message: 'Sync simulated' };
});
exports.triggerFullResync = (0, https_1.onCall)({
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 540
}, async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    const db = admin.firestore();
    const calendarsRef = db.collection('users').doc(userId).collection('connected_calendars');
    const snapshot = await calendarsRef.get();
    const results = [];
    for (const doc of snapshot.docs) {
        const calendarEmail = doc.id;
        await doc.ref.update({ syncToken: null });
        await performCalendarSync(userId, calendarEmail, true);
        results.push(calendarEmail);
    }
    return { success: true, message: `Full re-sync completed for: ${results.join(', ')}` };
});
//# sourceMappingURL=index.js.map