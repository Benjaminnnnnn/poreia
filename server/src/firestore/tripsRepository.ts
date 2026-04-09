import { FirestoreClient } from './client';
import type { FirestoreDocument } from './values';
import type {
  MessageDoc,
  SnapshotDoc,
  TripMemberDoc,
  TripMembershipMirrorDoc,
  TripSummaryDoc,
  UserProfileDoc,
} from '../types/domain';

function userPath(userId: string): string {
  return `users/${userId}`;
}

function membershipMirrorPath(userId: string, tripId: string): string {
  return `${userPath(userId)}/trip-memberships/${tripId}`;
}

function tripPath(tripId: string): string {
  return `trips/${tripId}`;
}

function tripMemberPath(tripId: string, userId: string): string {
  return `${tripPath(tripId)}/members/${userId}`;
}

function tripSnapshotPath(tripId: string, snapshotId: string): string {
  return `${tripPath(tripId)}/snapshots/${snapshotId}`;
}

function tripMessagePath(tripId: string, messageId: string): string {
  return `${tripPath(tripId)}/messages/${messageId}`;
}

interface CreateTripBundle {
  initialMessage: MessageDoc;
  messageId: string;
  member: TripMemberDoc;
  mirror: TripMembershipMirrorDoc;
  snapshot: SnapshotDoc;
  summary: TripSummaryDoc;
  tripId: string;
  user: UserProfileDoc;
}

interface MembershipMirrorWrite {
  currentDocument?: { exists?: boolean; updateTime?: string };
  mirror: TripMembershipMirrorDoc;
  userId: string;
}

interface CommitTripRevisionInput {
  membershipMirrors: MembershipMirrorWrite[];
  message?: MessageDoc;
  messageId?: string;
  snapshot: SnapshotDoc;
  snapshotId: string;
  summary: TripSummaryDoc;
  summaryUpdateTime?: string;
  tripId: string;
}

interface MemberWrite {
  currentDocument?: { exists?: boolean; updateTime?: string };
  member: TripMemberDoc;
}

interface UserProfileWrite {
  user: UserProfileDoc;
  userId: string;
}

interface CommitTripMutationInput {
  deleteTrip?: boolean;
  memberDeletes?: string[];
  memberUpserts?: MemberWrite[];
  membershipMirrorDeletes?: string[];
  membershipMirrorUpserts?: MembershipMirrorWrite[];
  messageDeletes?: string[];
  snapshotDeletes?: string[];
  summary?: TripSummaryDoc;
  summaryUpdateTime?: string;
  tripId: string;
  userProfileUpserts?: UserProfileWrite[];
}

export interface UserRecord {
  user: UserProfileDoc;
  userId: string;
}

function documentId(name: string): string {
  return name.split('/').pop() ?? '';
}

export class TripsRepository {
  constructor(private readonly firestore: FirestoreClient) {}

  async getUser(userId: string): Promise<UserProfileDoc | null> {
    const document = await this.firestore.getDocument<UserProfileDoc>(userPath(userId));
    return document?.data ?? null;
  }

  async upsertUser(userId: string, user: UserProfileDoc): Promise<void> {
    await this.firestore.commit([
      this.firestore.buildUpdateWrite(
        userPath(userId),
        user as unknown as Record<string, unknown>,
      ),
    ]);
  }

  async getUserRecord(userId: string): Promise<UserRecord | null> {
    const document = await this.firestore.getDocument<UserProfileDoc>(userPath(userId));
    if (!document) {
      return null;
    }

    return {
      userId,
      user: document.data,
    };
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const documents = await this.firestore.listDocuments<UserProfileDoc>(undefined, 'users', {
      pageSize: 500,
    });
    const match = documents.find(
      (document) => document.data.email.trim().toLowerCase() === normalizedEmail,
    );

    if (!match) {
      return null;
    }

    return {
      userId: documentId(match.name),
      user: match.data,
    };
  }

  async createTripBundle(bundle: CreateTripBundle): Promise<void> {
    const writes = [
      this.firestore.buildUpdateWrite(
        userPath(bundle.member.userId),
        bundle.user as unknown as Record<string, unknown>,
      ),
      this.firestore.buildUpdateWrite(
        tripPath(bundle.tripId),
        bundle.summary as unknown as Record<string, unknown>,
        { exists: false },
      ),
      this.firestore.buildUpdateWrite(
        tripMemberPath(bundle.tripId, bundle.member.userId),
        bundle.member as unknown as Record<string, unknown>,
        { exists: false },
      ),
      this.firestore.buildUpdateWrite(
        tripSnapshotPath(bundle.tripId, bundle.summary.currentSnapshotId),
        bundle.snapshot as unknown as Record<string, unknown>,
        { exists: false },
      ),
      this.firestore.buildUpdateWrite(
        tripMessagePath(bundle.tripId, bundle.messageId),
        bundle.initialMessage as unknown as Record<string, unknown>,
        { exists: false },
      ),
      this.firestore.buildUpdateWrite(
        membershipMirrorPath(bundle.member.userId, bundle.tripId),
        bundle.mirror as unknown as Record<string, unknown>,
        { exists: false },
      ),
    ];

    await this.firestore.commit(writes);
  }

  async listMembershipMirrors(userId: string, pageSize: number): Promise<Array<TripMembershipMirrorDoc>> {
    const documents = await this.firestore.listDocuments<TripMembershipMirrorDoc>(
      userPath(userId),
      'trip-memberships',
      {
        orderBy: 'updatedAt desc,__name__ desc',
        pageSize,
      },
    );

    return documents.map((document) => document.data);
  }

  async getTripSummary(tripId: string): Promise<TripSummaryDoc | null> {
    const document = await this.getTripSummaryDocument(tripId);
    return document?.data ?? null;
  }

  async getTripSummaryDocument(tripId: string): Promise<FirestoreDocument<TripSummaryDoc> | null> {
    return this.firestore.getDocument<TripSummaryDoc>(tripPath(tripId));
  }

  async getTripMember(tripId: string, userId: string): Promise<TripMemberDoc | null> {
    const document = await this.firestore.getDocument<TripMemberDoc>(tripMemberPath(tripId, userId));
    return document?.data ?? null;
  }

  async getSnapshot(tripId: string, snapshotId: string): Promise<SnapshotDoc | null> {
    const document = await this.firestore.getDocument<SnapshotDoc>(
      tripSnapshotPath(tripId, snapshotId),
    );
    return document?.data ?? null;
  }

  async listMessages(tripId: string, pageSize: number): Promise<Array<{ id: string; message: MessageDoc }>> {
    const documents = await this.firestore.listDocuments<MessageDoc>(tripPath(tripId), 'messages', {
      orderBy: 'createdAt desc,__name__ desc',
      pageSize,
    });

    return documents.map((document) => ({
      id: documentId(document.name),
      message: document.data,
    }));
  }

  async listMembers(tripId: string): Promise<Array<TripMemberDoc>> {
    const documents = await this.firestore.listDocuments<TripMemberDoc>(tripPath(tripId), 'members', {
      orderBy: 'joinedAt asc,__name__ asc',
      pageSize: 100,
    });

    return documents.map((document) => document.data);
  }

  async listSnapshots(tripId: string, pageSize: number): Promise<Array<{ id: string; snapshot: SnapshotDoc }>> {
    const documents = await this.firestore.listDocuments<SnapshotDoc>(tripPath(tripId), 'snapshots', {
      orderBy: 'createdAt desc,__name__ desc',
      pageSize,
    });

    return documents.map((document) => ({
      id: documentId(document.name),
      snapshot: document.data,
    }));
  }

  async commitTripRevision(input: CommitTripRevisionInput): Promise<void> {
    const writes = [
      this.firestore.buildUpdateWrite(
        tripSnapshotPath(input.tripId, input.snapshotId),
        input.snapshot as unknown as Record<string, unknown>,
        { exists: false },
      ),
      ...(input.message && input.messageId
        ? [
            this.firestore.buildUpdateWrite(
              tripMessagePath(input.tripId, input.messageId),
              input.message as unknown as Record<string, unknown>,
              { exists: false },
            ),
          ]
        : []),
      this.firestore.buildUpdateWrite(
        tripPath(input.tripId),
        input.summary as unknown as Record<string, unknown>,
        input.summaryUpdateTime
          ? { updateTime: input.summaryUpdateTime }
          : undefined,
      ),
      ...input.membershipMirrors.map(({ userId, mirror }) =>
        this.firestore.buildUpdateWrite(
          membershipMirrorPath(userId, input.tripId),
          mirror as unknown as Record<string, unknown>,
        ),
      ),
    ];

    await this.firestore.commit(writes);
  }

  async commitTripMutation(input: CommitTripMutationInput): Promise<void> {
    const writes = [
      ...(input.summary
        ? [
            this.firestore.buildUpdateWrite(
              tripPath(input.tripId),
              input.summary as unknown as Record<string, unknown>,
              input.summaryUpdateTime
                ? { updateTime: input.summaryUpdateTime }
                : undefined,
            ),
          ]
        : []),
      ...(input.memberUpserts ?? []).map(({ member, currentDocument }) =>
        this.firestore.buildUpdateWrite(
          tripMemberPath(input.tripId, member.userId),
          member as unknown as Record<string, unknown>,
          currentDocument,
        ),
      ),
      ...(input.memberDeletes ?? []).map((userId) =>
        this.firestore.buildDeleteWrite(tripMemberPath(input.tripId, userId)),
      ),
      ...(input.membershipMirrorUpserts ?? []).map(({ userId, mirror, currentDocument }) =>
        this.firestore.buildUpdateWrite(
          membershipMirrorPath(userId, input.tripId),
          mirror as unknown as Record<string, unknown>,
          currentDocument,
        ),
      ),
      ...(input.membershipMirrorDeletes ?? []).map((userId) =>
        this.firestore.buildDeleteWrite(membershipMirrorPath(userId, input.tripId)),
      ),
      ...(input.userProfileUpserts ?? []).map(({ userId, user }) =>
        this.firestore.buildUpdateWrite(
          userPath(userId),
          user as unknown as Record<string, unknown>,
        ),
      ),
      ...(input.snapshotDeletes ?? []).map((snapshotId) =>
        this.firestore.buildDeleteWrite(tripSnapshotPath(input.tripId, snapshotId)),
      ),
      ...(input.messageDeletes ?? []).map((messageId) =>
        this.firestore.buildDeleteWrite(tripMessagePath(input.tripId, messageId)),
      ),
      ...(input.deleteTrip ? [this.firestore.buildDeleteWrite(tripPath(input.tripId))] : []),
    ];

    await this.firestore.commit(writes);
  }
}
