/**
 * Imports Firestore data into PostgreSQL via Drizzle ORM.
 * Reads: data/firestore-trips.json, data/firestore-users.json, data/uid-mapping.json
 *
 * Insertion order (respects FK constraints):
 *   1. users
 *   2. trips
 *   3. trip_members
 *   4. snapshots
 *   5. messages
 *
 * TripMembershipMirrorDoc is intentionally skipped — replaced by SQL JOINs.
 * All inserts use onConflictDoNothing() — safe to re-run.
 *
 * Usage: npx tsx scripts/migrate/03-import-postgres.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
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

// ── Load export files ─────────────────────────────────────────────────────────

const uidMapping: Record<string, string> = JSON.parse(
  readFileSync("scripts/migrate/data/uid-mapping.json", "utf-8"),
);
const firestoreUsers: { id: string; profile: Record<string, unknown> }[] = JSON.parse(
  readFileSync("scripts/migrate/data/firestore-users.json", "utf-8"),
);
const firestoreTrips: {
  id: string;
  summary: Record<string, unknown>;
  members: Record<string, unknown>[];
  snapshots: Record<string, unknown>[];
  messages: Record<string, unknown>[];
}[] = JSON.parse(readFileSync("scripts/migrate/data/firestore-trips.json", "utf-8"));

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapUid(firebaseUid: string | null | undefined, field: string): string | null {
  if (!firebaseUid) return null;
  const uuid = uidMapping[firebaseUid];
  if (!uuid) console.warn(`  ⚠ No mapping for Firebase UID "${firebaseUid}" (field: ${field})`);
  return uuid ?? null;
}

function requireUid(firebaseUid: string, field: string): string {
  const uuid = mapUid(firebaseUid, field);
  if (!uuid) throw new Error(`Missing required UID mapping for "${firebaseUid}" (${field})`);
  return uuid;
}

function toDate(iso: string | null | undefined): Date | null {
  return iso ? new Date(iso) : null;
}

function requireDate(iso: unknown, field: string): Date {
  if (typeof iso !== "string") throw new Error(`Missing required date for field: ${field}`);
  return new Date(iso);
}

// ── Step 1: Users ─────────────────────────────────────────────────────────────

async function importUsers() {
  console.log("Importing users...");
  let count = 0;

  for (const { id: firebaseUid, profile } of firestoreUsers) {
    const id = mapUid(firebaseUid, "users.id");
    if (!id) {
      console.warn(`  ⚠ Skipping user ${firebaseUid} — no Supabase UUID`);
      continue;
    }

    await db.insert(users).values({
      id,
      email:           profile.email as string,
      displayName:     (profile.displayName as string) ?? null,
      photoUrl:        (profile.photoURL as string) ?? null,
      travelerName:    (profile.travelerName as string) ?? null,
      ownedTripCount:  (profile.ownedTripCount as number) ?? 0,
      sharedTripCount: (profile.sharedTripCount as number) ?? 0,
      createdAt:       requireDate(profile.createdAt, "user.createdAt"),
      updatedAt:       requireDate(profile.updatedAt, "user.updatedAt"),
      lastSeenAt:      requireDate(profile.lastSeenAt, "user.lastSeenAt"),
    }).onConflictDoNothing();

    count++;
  }

  console.log(`  ✓ ${count} users`);
}

// ── Step 2: Trips ─────────────────────────────────────────────────────────────

async function importTrips() {
  console.log("Importing trips...");
  let count = 0;

  for (const { id, summary } of firestoreTrips) {
    const ownerId = requireUid(summary.ownerId as string, "trip.ownerId");

    await db.insert(trips).values({
      id,
      ownerId,
      title:            summary.title as string,
      destination:      summary.destination as string,
      overview:         summary.overview as string,
      totalDays:        summary.totalDays as number,
      totalBudget:      summary.totalBudget as number,
      currency:         summary.currency as string,
      status:           summary.status as string,
      visibility:       summary.visibility as string,
      version:          (summary.version as number) ?? 1,
      currentSnapshotId: (summary.currentSnapshotId as string) ?? null,
      memberCount:      (summary.memberCount as number) ?? 0,
      messageCount:     (summary.messageCount as number) ?? 0,
      activityCount:    (summary.activityCount as number) ?? 0,
      createdAt:        requireDate(summary.createdAt, "trip.createdAt"),
      updatedAt:        requireDate(summary.updatedAt, "trip.updatedAt"),
      lastRefinedAt:    toDate(summary.lastRefinedAt as string | null),
      lastManualEditAt: toDate(summary.lastManualEditAt as string | null),
      archivedAt:       toDate(summary.archivedAt as string | null),
    }).onConflictDoNothing();

    count++;
  }

  console.log(`  ✓ ${count} trips`);
}

// ── Step 3: Trip members ──────────────────────────────────────────────────────

async function importMembers() {
  console.log("Importing trip members...");
  let count = 0;

  for (const { id: tripId, members } of firestoreTrips) {
    for (const member of members) {
      const userId = mapUid(member.userId as string, "member.userId");
      if (!userId) {
        console.warn(`  ⚠ Skipping member ${member.userId} in trip ${tripId} — no UUID`);
        continue;
      }

      await db.insert(tripMembers).values({
        tripId,
        userId,
        role:        member.role as string,
        status:      member.status as string,
        displayName: member.displayName as string,
        email:       member.email as string,
        invitedBy:   mapUid(member.invitedBy as string | null, "member.invitedBy"),
        joinedAt:    requireDate(member.joinedAt, "member.joinedAt"),
        updatedAt:   requireDate(member.joinedAt, "member.joinedAt"), // no updatedAt in Firestore doc
      }).onConflictDoNothing();

      count++;
    }
  }

  console.log(`  ✓ ${count} trip members`);
}

// ── Step 4: Snapshots ─────────────────────────────────────────────────────────

async function importSnapshots() {
  console.log("Importing snapshots...");
  let count = 0;

  for (const { id: tripId, snapshots: snaps } of firestoreTrips) {
    for (const snap of snaps) {
      await db.insert(snapshots).values({
        id:        snap.id as string,
        tripId,
        version:   snap.version as number,
        source:    snap.source as string,
        prompt:    (snap.prompt as string) ?? null,
        itinerary: snap.itinerary as object,
        createdBy: mapUid(snap.createdBy as string | null, "snapshot.createdBy"),
        createdAt: requireDate(snap.createdAt, "snapshot.createdAt"),
      }).onConflictDoNothing();

      count++;
    }
  }

  console.log(`  ✓ ${count} snapshots`);
}

// ── Step 5: Messages ──────────────────────────────────────────────────────────

async function importMessages() {
  console.log("Importing messages...");
  let count = 0;

  for (const { id: tripId, messages: msgs } of firestoreTrips) {
    for (const msg of msgs) {
      await db.insert(messages).values({
        id:         msg.id as string,
        tripId,
        role:       msg.role as string,
        text:       msg.text as string,
        snapshotId: (msg.snapshotId as string) ?? null,
        requestId:  (msg.requestId as string) ?? null,
        createdAt:  requireDate(msg.createdAt, "message.createdAt"),
      }).onConflictDoNothing();

      count++;
    }
  }

  console.log(`  ✓ ${count} messages`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Importing Firestore data into PostgreSQL...\n");

  await importUsers();
  await importTrips();
  await importMembers();
  await importSnapshots();
  await importMessages();

  console.log("\n✓ Import complete");
  await client.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
