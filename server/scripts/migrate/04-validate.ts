/**
 * Validates the migration by comparing record counts between
 * the Firestore export files and PostgreSQL.
 *
 * Exits with code 1 if any count mismatches.
 *
 * Usage: npx tsx scripts/migrate/04-validate.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { count } from "drizzle-orm";
import { readFileSync } from "fs";
import "dotenv/config";
import {
  users,
  trips,
  tripMembers,
  snapshots,
  messages,
} from "../../src/infrastructure/persistence/drizzle/schema.js";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client);

type FirestoreTrip = { members: unknown[]; snapshots: unknown[]; messages: unknown[] };

function load<T>(file: string): T {
  return JSON.parse(readFileSync(`scripts/migrate/data/${file}`, "utf-8"));
}

async function main() {
  const firebaseUsers  = load<unknown[]>("firebase-users.json");
  const firestoreUsers = load<unknown[]>("firestore-users.json");
  const firestoreTrips = load<FirestoreTrip[]>("firestore-trips.json");
  const uidMapping     = load<Record<string, string>>("uid-mapping.json");

  const mappedUidSet    = new Set(Object.keys(uidMapping));
  const expectedUsers   = firestoreUsers.filter((u) => mappedUidSet.has((u as { id: string }).id)).length;
  const expectedMembers = firestoreTrips.reduce((n, t) => n + t.members.length, 0);
  const expectedSnaps   = firestoreTrips.reduce((n, t) => n + t.snapshots.length, 0);
  const expectedMsgs    = firestoreTrips.reduce((n, t) => n + t.messages.length, 0);

  const [pgUsers]   = await db.select({ value: count() }).from(users);
  const [pgTrips]   = await db.select({ value: count() }).from(trips);
  const [pgMembers] = await db.select({ value: count() }).from(tripMembers);
  const [pgSnaps]   = await db.select({ value: count() }).from(snapshots);
  const [pgMsgs]    = await db.select({ value: count() }).from(messages);

  const checks = [
    { label: "Auth users mapped", expected: firebaseUsers.length,    actual: Object.keys(uidMapping).length },
    { label: "Users",             expected: expectedUsers,            actual: pgUsers.value },
    { label: "Trips",             expected: firestoreTrips.length,    actual: pgTrips.value },
    { label: "Trip members",      expected: expectedMembers,          actual: pgMembers.value },
    { label: "Snapshots",         expected: expectedSnaps,            actual: pgSnaps.value },
    { label: "Messages",          expected: expectedMsgs,             actual: pgMsgs.value },
  ];

  let failed = false;
  console.log("\nValidation results:\n");

  for (const { label, expected, actual } of checks) {
    const ok   = actual === expected;
    const icon = ok ? "✓" : "✗";
    const note = ok ? "" : `  ← expected ${expected}, got ${actual}`;
    console.log(`  ${icon} ${label}: ${actual}/${expected}${note}`);
    if (!ok) failed = true;
  }

  console.log();

  if (failed) {
    console.error("Validation FAILED — investigate mismatches before proceeding.");
  } else {
    console.log("All counts match. Migration validated ✓");
  }

  await client.end();
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
