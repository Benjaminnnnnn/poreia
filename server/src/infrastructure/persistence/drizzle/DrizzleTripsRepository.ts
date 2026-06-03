import { and, desc, eq } from 'drizzle-orm';
import type { DrizzleClient } from './client';
import { messages, snapshots, tripMembers, trips, users } from './schema';
import type {
  MessageDoc,
  MembershipStatus,
  SnapshotDoc,
  SnapshotSource,
  TripMemberDoc,
  TripMembershipMirrorDoc,
  TripRole,
  TripStatus,
  TripSummaryDoc,
  TravelItinerary,
  TripVisibility,
  UserProfileDoc,
} from '../../../types/domain';
import type { MessageRole } from '../../../types/domain';

// ── Exported types (mirrors those from the Firestore repo) ────────────────────

export interface UserRecord {
  user: UserProfileDoc;
  userId: string;
}

// These mirror the internal types from tripsRepository.ts so callers work unchanged.

interface MembershipMirrorWrite {
  currentDocument?: { exists?: boolean; updateTime?: string };
  mirror: TripMembershipMirrorDoc;
  userId: string;
}

interface MemberWrite {
  currentDocument?: { exists?: boolean; updateTime?: string };
  member: TripMemberDoc;
}

interface UserProfileWrite {
  user: UserProfileDoc;
  userId: string;
}

export interface CreateTripBundle {
  initialMessage: MessageDoc;
  messageId: string;
  member: TripMemberDoc;
  mirror: TripMembershipMirrorDoc;      // accepted but ignored — SQL JOINs replace mirrors
  snapshot: SnapshotDoc;
  summary: TripSummaryDoc;
  tripId: string;
  user: UserProfileDoc;
}

export interface CommitTripRevisionInput {
  membershipMirrors: MembershipMirrorWrite[]; // ignored — SQL JOINs replace mirrors
  message?: MessageDoc;
  messageId?: string;
  snapshot: SnapshotDoc;
  snapshotId: string;
  summary: TripSummaryDoc;
  summaryUpdateTime?: string;                  // ignored — PostgreSQL handles consistency
  tripId: string;
}

export interface CommitTripMutationInput {
  deleteTrip?: boolean;
  memberDeletes?: string[];
  memberUpserts?: MemberWrite[];
  membershipMirrorDeletes?: string[];          // ignored
  membershipMirrorUpserts?: MembershipMirrorWrite[]; // ignored
  messageDeletes?: string[];
  snapshotDeletes?: string[];
  summary?: TripSummaryDoc;
  summaryUpdateTime?: string;                  // ignored
  tripId: string;
  userProfileUpserts?: UserProfileWrite[];
}

// ── Row → Doc mappers ─────────────────────────────────────────────────────────

type UserRow     = typeof users.$inferSelect;
type TripRow     = typeof trips.$inferSelect;
type MemberRow   = typeof tripMembers.$inferSelect;
type SnapshotRow = typeof snapshots.$inferSelect;
type MessageRow  = typeof messages.$inferSelect;

function iso(date: Date): string {
  return date.toISOString();
}

function isoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function toUserDoc(row: UserRow): UserProfileDoc {
  return {
    displayName: row.displayName ?? '',
    email: row.email,
    photoURL: row.photoUrl,
    travelerName: row.travelerName,
    ownedTripCount: row.ownedTripCount,
    sharedTripCount: row.sharedTripCount,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    lastSeenAt: iso(row.lastSeenAt),
  };
}

function toTripSummaryDoc(row: TripRow): TripSummaryDoc {
  return {
    ownerId: row.ownerId,
    title: row.title,
    destination: row.destination,
    overview: row.overview,
    totalDays: row.totalDays,
    totalBudget: row.totalBudget,
    currency: row.currency,
    status: row.status as TripStatus,
    visibility: row.visibility as TripVisibility,
    version: row.version,
    currentSnapshotId: row.currentSnapshotId ?? '',
    memberCount: row.memberCount,
    messageCount: row.messageCount,
    activityCount: row.activityCount,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    lastRefinedAt: isoOrNull(row.lastRefinedAt),
    lastManualEditAt: isoOrNull(row.lastManualEditAt),
    archivedAt: isoOrNull(row.archivedAt),
  };
}

function toMemberDoc(row: MemberRow): TripMemberDoc {
  return {
    userId: row.userId,
    role: row.role as TripRole,
    status: row.status as MembershipStatus,
    displayName: row.displayName,
    email: row.email,
    joinedAt: iso(row.joinedAt),
    invitedBy: row.invitedBy ?? row.userId,
  };
}

function toSnapshotDoc(row: SnapshotRow): SnapshotDoc {
  return {
    tripId: row.tripId,
    version: row.version,
    source: row.source as SnapshotSource,
    prompt: row.prompt,
    createdAt: iso(row.createdAt),
    createdBy: row.createdBy ?? '',
    itinerary: row.itinerary as TravelItinerary,
  };
}

function toMessageDoc(row: MessageRow): MessageDoc {
  return {
    role: row.role as MessageRole,
    text: row.text,
    createdAt: iso(row.createdAt),
    snapshotId: row.snapshotId,
    requestId: row.requestId,
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export class DrizzleTripsRepository {
  constructor(private readonly db: DrizzleClient) {}

  // ── Users ──────────────────────────────────────────────────────────────────

  async getUser(userId: string): Promise<UserProfileDoc | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId));
    return row ? toUserDoc(row) : null;
  }

  async upsertUser(userId: string, user: UserProfileDoc): Promise<void> {
    await this.db
      .insert(users)
      .values({
        id: userId,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoURL,
        travelerName: user.travelerName,
        ownedTripCount: user.ownedTripCount,
        sharedTripCount: user.sharedTripCount,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
        lastSeenAt: new Date(user.lastSeenAt),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          displayName: user.displayName,
          photoUrl: user.photoURL,
          travelerName: user.travelerName,
          ownedTripCount: user.ownedTripCount,
          sharedTripCount: user.sharedTripCount,
          updatedAt: new Date(user.updatedAt),
          lastSeenAt: new Date(user.lastSeenAt),
        },
      });
  }

  async getUserRecord(userId: string): Promise<UserRecord | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId));
    return row ? { userId: row.id, user: toUserDoc(row) } : null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email));
    return row ? { userId: row.id, user: toUserDoc(row) } : null;
  }

  // ── Trips ──────────────────────────────────────────────────────────────────

  async getTripSummary(tripId: string): Promise<TripSummaryDoc | null> {
    const doc = await this.getTripSummaryDocument(tripId);
    return doc?.data ?? null;
  }

  async getTripSummaryDocument(tripId: string): Promise<{ name: string; updateTime?: string; data: TripSummaryDoc } | null> {
    const [row] = await this.db.select().from(trips).where(eq(trips.id, tripId));
    return row ? { name: tripId, data: toTripSummaryDoc(row) } : null;
  }

  async getTripMember(tripId: string, userId: string): Promise<TripMemberDoc | null> {
    const [row] = await this.db
      .select()
      .from(tripMembers)
      .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)));
    return row ? toMemberDoc(row) : null;
  }

  async listMembers(tripId: string): Promise<TripMemberDoc[]> {
    const rows = await this.db
      .select()
      .from(tripMembers)
      .where(eq(tripMembers.tripId, tripId))
      .orderBy(tripMembers.joinedAt);
    return rows.map(toMemberDoc);
  }

  // Replaces listMembershipMirrors — JOIN trips + trip_members for the user's trip list.
  async listMembershipMirrors(userId: string, pageSize: number): Promise<TripMembershipMirrorDoc[]> {
    const rows = await this.db
      .select()
      .from(trips)
      .innerJoin(tripMembers, eq(trips.id, tripMembers.tripId))
      .where(eq(tripMembers.userId, userId))
      .orderBy(desc(tripMembers.joinedAt), desc(trips.id))
      .limit(pageSize);

    return rows.map(({ trips: t, trip_members: m }) => ({
      tripId: t.id,
      ownerId: t.ownerId,
      role: m.role as TripRole,
      status: m.status as MembershipStatus,
      title: t.title,
      destination: t.destination,
      overview: t.overview,
      totalDays: t.totalDays,
      totalBudget: t.totalBudget,
      currency: t.currency,
      tripStatus: t.status as TripStatus,
      visibility: t.visibility as TripVisibility,
      version: t.version,
      currentSnapshotId: t.currentSnapshotId ?? '',
      memberCount: t.memberCount,
      createdAt: iso(t.createdAt),
      updatedAt: iso(t.updatedAt),
      lastRefinedAt: isoOrNull(t.lastRefinedAt),
      archivedAt: isoOrNull(t.archivedAt),
      joinedAt: iso(m.joinedAt),
    }));
  }

  // ── Snapshots ──────────────────────────────────────────────────────────────

  async getSnapshot(tripId: string, snapshotId: string): Promise<SnapshotDoc | null> {
    const [row] = await this.db
      .select()
      .from(snapshots)
      .where(and(eq(snapshots.id, snapshotId), eq(snapshots.tripId, tripId)));
    return row ? toSnapshotDoc(row) : null;
  }

  async listSnapshots(tripId: string, pageSize: number): Promise<Array<{ id: string; snapshot: SnapshotDoc }>> {
    const rows = await this.db
      .select()
      .from(snapshots)
      .where(eq(snapshots.tripId, tripId))
      .orderBy(desc(snapshots.createdAt))
      .limit(pageSize);
    return rows.map((row) => ({ id: row.id, snapshot: toSnapshotDoc(row) }));
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  async listMessages(tripId: string, pageSize: number): Promise<Array<{ id: string; message: MessageDoc }>> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.tripId, tripId))
      .orderBy(desc(messages.createdAt))
      .limit(pageSize);
    return rows.map((row) => ({ id: row.id, message: toMessageDoc(row) }));
  }

  // ── Batch writes ───────────────────────────────────────────────────────────

  async createTripBundle(bundle: CreateTripBundle): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({
          id: bundle.member.userId,
          email: bundle.user.email,
          displayName: bundle.user.displayName,
          photoUrl: bundle.user.photoURL,
          travelerName: bundle.user.travelerName,
          ownedTripCount: bundle.user.ownedTripCount,
          sharedTripCount: bundle.user.sharedTripCount,
          createdAt: new Date(bundle.user.createdAt),
          updatedAt: new Date(bundle.user.updatedAt),
          lastSeenAt: new Date(bundle.user.lastSeenAt),
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            displayName: bundle.user.displayName,
            photoUrl: bundle.user.photoURL,
            ownedTripCount: bundle.user.ownedTripCount,
            sharedTripCount: bundle.user.sharedTripCount,
            updatedAt: new Date(bundle.user.updatedAt),
            lastSeenAt: new Date(bundle.user.lastSeenAt),
          },
        });

      await tx
        .insert(trips)
        .values({
          id: bundle.tripId,
          ownerId: bundle.member.userId,
          title: bundle.summary.title,
          destination: bundle.summary.destination,
          overview: bundle.summary.overview,
          totalDays: bundle.summary.totalDays,
          totalBudget: bundle.summary.totalBudget,
          currency: bundle.summary.currency,
          status: bundle.summary.status,
          visibility: bundle.summary.visibility,
          version: bundle.summary.version,
          currentSnapshotId: bundle.summary.currentSnapshotId,
          memberCount: bundle.summary.memberCount,
          messageCount: bundle.summary.messageCount,
          activityCount: bundle.summary.activityCount,
          createdAt: new Date(bundle.summary.createdAt),
          updatedAt: new Date(bundle.summary.updatedAt),
          lastRefinedAt: bundle.summary.lastRefinedAt ? new Date(bundle.summary.lastRefinedAt) : null,
          lastManualEditAt: bundle.summary.lastManualEditAt ? new Date(bundle.summary.lastManualEditAt) : null,
          archivedAt: bundle.summary.archivedAt ? new Date(bundle.summary.archivedAt) : null,
        })
        .onConflictDoNothing();

      await tx
        .insert(tripMembers)
        .values({
          tripId: bundle.tripId,
          userId: bundle.member.userId,
          role: bundle.member.role,
          status: bundle.member.status,
          displayName: bundle.member.displayName,
          email: bundle.member.email,
          invitedBy: bundle.member.invitedBy ?? null,
          joinedAt: new Date(bundle.member.joinedAt),
          updatedAt: new Date(bundle.member.joinedAt),
        })
        .onConflictDoNothing();

      await tx
        .insert(snapshots)
        .values({
          id: bundle.summary.currentSnapshotId,
          tripId: bundle.tripId,
          version: bundle.snapshot.version,
          source: bundle.snapshot.source,
          prompt: bundle.snapshot.prompt,
          itinerary: bundle.snapshot.itinerary as object,
          createdBy: bundle.snapshot.createdBy,
          createdAt: new Date(bundle.snapshot.createdAt),
        })
        .onConflictDoNothing();

      await tx
        .insert(messages)
        .values({
          id: bundle.messageId,
          tripId: bundle.tripId,
          role: bundle.initialMessage.role,
          text: bundle.initialMessage.text,
          snapshotId: bundle.initialMessage.snapshotId,
          requestId: bundle.initialMessage.requestId,
          createdAt: new Date(bundle.initialMessage.createdAt),
        })
        .onConflictDoNothing();
    });
  }

  async commitTripRevision(input: CommitTripRevisionInput): Promise<void> {
    // summaryUpdateTime and membershipMirrors are ignored — PostgreSQL handles consistency.
    const s = input.summary;
    await this.db.transaction(async (tx) => {
      await tx
        .update(trips)
        .set({
          title: s.title,
          destination: s.destination,
          overview: s.overview,
          totalDays: s.totalDays,
          totalBudget: s.totalBudget,
          currency: s.currency,
          status: s.status,
          visibility: s.visibility,
          version: s.version,
          currentSnapshotId: s.currentSnapshotId,
          memberCount: s.memberCount,
          messageCount: s.messageCount,
          activityCount: s.activityCount,
          updatedAt: new Date(s.updatedAt),
          lastRefinedAt: s.lastRefinedAt ? new Date(s.lastRefinedAt) : null,
          lastManualEditAt: s.lastManualEditAt ? new Date(s.lastManualEditAt) : null,
          archivedAt: s.archivedAt ? new Date(s.archivedAt) : null,
        })
        .where(eq(trips.id, input.tripId));

      await tx
        .insert(snapshots)
        .values({
          id: input.snapshotId,
          tripId: input.tripId,
          version: input.snapshot.version,
          source: input.snapshot.source,
          prompt: input.snapshot.prompt,
          itinerary: input.snapshot.itinerary as object,
          createdBy: input.snapshot.createdBy,
          createdAt: new Date(input.snapshot.createdAt),
        })
        .onConflictDoNothing();

      if (input.message && input.messageId) {
        await tx
          .insert(messages)
          .values({
            id: input.messageId,
            tripId: input.tripId,
            role: input.message.role,
            text: input.message.text,
            snapshotId: input.message.snapshotId,
            requestId: input.message.requestId,
            createdAt: new Date(input.message.createdAt),
          })
          .onConflictDoNothing();
      }
    });
  }

  async commitTripMutation(input: CommitTripMutationInput): Promise<void> {
    // summaryUpdateTime, membershipMirrorUpserts, membershipMirrorDeletes are ignored.
    await this.db.transaction(async (tx) => {
      if (input.summary) {
        const s = input.summary;
        await tx
          .update(trips)
          .set({
            title: s.title,
            visibility: s.visibility,
            status: s.status,
            version: s.version,
            memberCount: s.memberCount,
            messageCount: s.messageCount,
            activityCount: s.activityCount,
            currentSnapshotId: s.currentSnapshotId,
            updatedAt: new Date(s.updatedAt),
            lastRefinedAt: s.lastRefinedAt ? new Date(s.lastRefinedAt) : null,
            lastManualEditAt: s.lastManualEditAt ? new Date(s.lastManualEditAt) : null,
            archivedAt: s.archivedAt ? new Date(s.archivedAt) : null,
          })
          .where(eq(trips.id, input.tripId));
      }

      for (const { member } of input.memberUpserts ?? []) {
        await tx
          .insert(tripMembers)
          .values({
            tripId: input.tripId,
            userId: member.userId,
            role: member.role,
            status: member.status,
            displayName: member.displayName,
            email: member.email,
            invitedBy: member.invitedBy ?? null,
            joinedAt: new Date(member.joinedAt),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [tripMembers.tripId, tripMembers.userId],
            set: {
              role: member.role,
              status: member.status,
              displayName: member.displayName,
              updatedAt: new Date(),
            },
          });
      }

      for (const userId of input.memberDeletes ?? []) {
        await tx
          .delete(tripMembers)
          .where(and(eq(tripMembers.tripId, input.tripId), eq(tripMembers.userId, userId)));
      }

      for (const { userId, user } of input.userProfileUpserts ?? []) {
        await tx
          .update(users)
          .set({
            ownedTripCount: user.ownedTripCount,
            sharedTripCount: user.sharedTripCount,
            updatedAt: new Date(user.updatedAt),
            lastSeenAt: new Date(user.lastSeenAt),
          })
          .where(eq(users.id, userId));
      }

      for (const snapshotId of input.snapshotDeletes ?? []) {
        await tx.delete(snapshots).where(eq(snapshots.id, snapshotId));
      }

      for (const messageId of input.messageDeletes ?? []) {
        await tx.delete(messages).where(eq(messages.id, messageId));
      }

      if (input.deleteTrip) {
        await tx.delete(trips).where(eq(trips.id, input.tripId));
      }
    });
  }
}
