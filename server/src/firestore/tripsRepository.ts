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

export class TripsRepository {
  constructor(private readonly firestore: FirestoreClient) {}

  async getUser(userId: string): Promise<UserProfileDoc | null> {
    const document = await this.firestore.getDocument<UserProfileDoc>(userPath(userId));
    return document?.data ?? null;
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
      id: document.name.split('/').pop() ?? '',
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
}
