/**
 * Exports all Firebase Auth users and Firestore collections to JSON files.
 * Output: scripts/migrate/data/firebase-users.json
 *         scripts/migrate/data/firestore-trips.json
 *         scripts/migrate/data/firestore-users.json
 *
 * Usage: npx tsx scripts/migrate/01-export-firebase.ts
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import "dotenv/config";

const serviceAccountPath = resolve(
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "../firebase-service-account.json",
);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

const app = initializeApp({ credential: cert(serviceAccount as ServiceAccount) });
const auth = getAuth(app);
const db = getFirestore(app);

mkdirSync("scripts/migrate/data", { recursive: true });

// ── Auth users ────────────────────────────────────────────────────────────────

async function exportAuthUsers() {
  const users: object[] = [];
  let pageToken: string | undefined;

  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(
      ...result.users.map((u) => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName ?? null,
        photoURL: u.photoURL ?? null,
        emailVerified: u.emailVerified,
        providers: u.providerData.map((p) => p.providerId),
        createdAt: u.metadata.creationTime,
        lastSignedInAt: u.metadata.lastSignInTime,
      })),
    );
    pageToken = result.pageToken;
  } while (pageToken);

  writeFileSync("scripts/migrate/data/firebase-users.json", JSON.stringify(users, null, 2));
  console.log(`✓ Exported ${users.length} auth users`);
}

// ── Firestore trips ───────────────────────────────────────────────────────────

async function exportTrips() {
  const tripsSnap = await db.collection("trips").get();
  const trips: object[] = [];

  for (const tripDoc of tripsSnap.docs) {
    const tripId = tripDoc.id;

    const [membersSnap, snapshotsSnap, messagesSnap] = await Promise.all([
      db.collection(`trips/${tripId}/members`).get(),
      db.collection(`trips/${tripId}/snapshots`).get(),
      db.collection(`trips/${tripId}/messages`).get(),
    ]);

    trips.push({
      id: tripId,
      summary: { id: tripId, ...tripDoc.data() },
      members: membersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      snapshots: snapshotsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      messages: messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });

    process.stdout.write(`\r  trips: ${trips.length}/${tripsSnap.size}`);
  }

  console.log();
  writeFileSync("scripts/migrate/data/firestore-trips.json", JSON.stringify(trips, null, 2));
  console.log(`✓ Exported ${trips.length} trips`);
}

// ── Firestore users ───────────────────────────────────────────────────────────

async function exportUsers() {
  const usersSnap = await db.collection("users").get();
  const users: object[] = [];

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;

    users.push({
      id: userId,
      profile: { id: userId, ...userDoc.data() },
    });
  }

  writeFileSync("scripts/migrate/data/firestore-users.json", JSON.stringify(users, null, 2));
  console.log(`✓ Exported ${users.length} user profiles`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Exporting Firebase data...\n");
  await exportAuthUsers();
  await exportTrips();
  await exportUsers();
  console.log("\nDone. Files written to scripts/migrate/data/");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
