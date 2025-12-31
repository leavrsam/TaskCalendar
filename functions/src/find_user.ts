
import * as admin from 'firebase-admin';

// Initialize with default credentials
if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'taskcalendar-809d8' });
}

async function main() {
    const db = admin.firestore();
    const users = await db.collection('users').get();
    if (users.empty) {
        console.log('No users found.');
        return;
    }
    users.docs.forEach(doc => {
        console.log(`User ID: ${doc.id}`);
    });
}

main().catch(console.error);
