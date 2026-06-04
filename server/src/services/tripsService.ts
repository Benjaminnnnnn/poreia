import { z } from 'zod';
import { AppError } from '../core/errors';
import { createPrefixedId } from '../core/id';
import { nowIsoString } from '../core/time';
import { TripsRepository } from '../firestore/tripsRepository';
import { ItineraryProvider, travelItinerarySchema } from '../itinerary/provider';
import type {
  AuthUser,
  MessageDoc,
  PublicTripResponse,
  SnapshotDoc,
  TripMemberDoc,
  TripMemberResponse,
  TripMembershipMirrorDoc,
  TripMessageResponse,
  TripPermissions,
  TripSummaryDoc,
  TripSummaryResponse,
  TravelItinerary,
  UserProfileDoc,
} from '../types/domain';

const REFINEMENT_HISTORY_LIMIT = 10;

const createTripSchema = z.object({
  clientRequestId: z.string().uuid().optional(),
  prompt: z.string().trim().min(1).max(1600),
});

const listTripsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  scope: z.enum(['owned', 'shared', 'all']).default('all'),
  status: z.enum(['active', 'archived', 'all']).default('active'),
});

const detailQuerySchema = z.object({
  messageLimit: z.coerce.number().int().min(1).max(50).default(10),
});

const refineTripSchema = z.object({
  clientRequestId: z.string().uuid().optional(),
  expectedVersion: z.coerce.number().int().min(1),
  prompt: z.string().trim().min(1).max(1600),
});

const replaceItinerarySchema = z.object({
  expectedVersion: z.coerce.number().int().min(1),
  itinerary: travelItinerarySchema,
});

const patchTripSchema = z
  .object({
    archived: z.boolean().optional(),
    expectedVersion: z.coerce.number().int().min(1),
    title: z.string().trim().min(1).max(200).optional(),
    visibility: z.enum(['private', 'shared']).optional(),
  })
  .superRefine((value, context) => {
    if (value.archived === undefined && value.title === undefined && value.visibility === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one mutable field is required.',
        path: ['title'],
      });
    }
  });

const listMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

interface ListTripsResult {
  data: TripSummaryResponse[];
  meta: {
    limit: number;
    nextCursor: string | null;
  };
}

interface TripDetailResult {
  currentItinerary: TravelItinerary;
  id: string;
  members?: TripMemberResponse[];
  permissions: TripPermissions;
  recentMessages: TripMessageResponse[];
  summary: TripSummaryResponse;
}

interface CreateTripInput {
  clientRequestId?: string;
  prompt: string;
}

interface RefineTripInput {
  clientRequestId?: string;
  expectedVersion: number;
  prompt: string;
}

interface ReplaceTripItineraryInput {
  expectedVersion: number;
  itinerary: TravelItinerary;
}

interface PatchTripInput {
  archived?: boolean;
  expectedVersion: number;
  title?: string;
  visibility?: 'private' | 'shared';
}

interface ListMessagesResult {
  data: TripMessageResponse[];
  meta: {
    limit: number;
    nextCursor: string | null;
  };
}

export interface GetTripDetailOptions {
  includeMembers: boolean;
  includeMessages: boolean;
  messageLimit: number;
}

interface EditableTripContext {
  activeMembers: TripMemberDoc[];
  membership: TripMemberDoc;
  summary: TripSummaryDoc;
  summaryUpdateTime?: string;
}

function getDisplayName(user: AuthUser, existingUser: UserProfileDoc | null): string {
  return (
    user.displayName?.trim() ||
    existingUser?.travelerName ||
    existingUser?.displayName ||
    user.email?.split('@')[0] ||
    'Traveler'
  );
}

function requireUserEmail(user: AuthUser, existingUser: UserProfileDoc | null): string {
  const email = user.email?.trim() || existingUser?.email?.trim();
  if (!email) {
    throw new AppError(422, 'validation_error', 'Authenticated user is missing an email address.');
  }

  return email;
}

function countActivities(itinerary: TravelItinerary): number {
  return itinerary.days.reduce((sum, day) => sum + day.activities.length, 0);
}

function normalizeComparableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function destinationsMatch(currentDestination: string, nextDestination: string): boolean {
  const current = normalizeComparableText(currentDestination);
  const next = normalizeComparableText(nextDestination);
  if (!current || !next) {
    return false;
  }

  if (current.includes(next) || next.includes(current)) {
    return true;
  }

  const currentTokens = current.split(' ').filter((token) => token.length > 2);
  const nextTokens = new Set(next.split(' ').filter((token) => token.length > 2));
  const overlapCount = currentTokens.filter((token) => nextTokens.has(token)).length;

  return overlapCount >= Math.min(2, currentTokens.length);
}

function assertRefinementStaysOnCurrentTrip(
  currentItinerary: TravelItinerary,
  nextItinerary: TravelItinerary,
): void {
  if (destinationsMatch(currentItinerary.destination, nextItinerary.destination)) {
    return;
  }

  throw new AppError(
    502,
    'provider_invalid_response',
    `The itinerary service returned ${nextItinerary.destination} instead of keeping the trip anchored to ${currentItinerary.destination}.`,
  );
}

function buildPermissions(role: TripSummaryResponse['accessRole']): TripPermissions {
  return {
    role,
    canDelete: role === 'owner',
    canEdit: role === 'owner' || role === 'editor',
    canManageMembers: role === 'owner',
    canView: true,
  };
}

function requireActiveMembership(membership: TripMemberDoc | null): TripMemberDoc {
  if (!membership || membership.status !== 'active') {
    throw new AppError(403, 'forbidden', 'You do not have access to this trip.');
  }

  return membership;
}

function requireEditableMembership(membership: TripMemberDoc | null): TripMemberDoc {
  const activeMembership = requireActiveMembership(membership);
  if (activeMembership.role === 'viewer') {
    throw new AppError(403, 'forbidden', 'You do not have permission to modify this trip.');
  }

  return activeMembership;
}

function requireOwnerMembership(membership: TripMemberDoc | null): TripMemberDoc {
  const activeMembership = requireActiveMembership(membership);
  if (activeMembership.role !== 'owner') {
    throw new AppError(403, 'forbidden', 'You do not have permission to modify this trip.');
  }

  return activeMembership;
}

function assertExpectedVersion(expectedVersion: number, actualVersion: number): void {
  if (expectedVersion !== actualVersion) {
    throw new AppError(409, 'stale_write', 'Trip has changed. Refresh and retry.');
  }
}

function toTripMessageResponse(id: string, message: MessageDoc): TripMessageResponse {
  return {
    id,
    role: message.role,
    text: message.text,
    createdAt: message.createdAt,
    snapshotId: message.snapshotId,
  };
}

function buildMembershipMirror(tripId: string, summary: TripSummaryDoc, member: TripMemberDoc): TripMembershipMirrorDoc {
  return {
    tripId,
    ownerId: summary.ownerId,
    role: member.role,
    status: member.status,
    title: summary.title,
    destination: summary.destination,
    overview: summary.overview,
    totalDays: summary.totalDays,
    totalBudget: summary.totalBudget,
    currency: summary.currency,
    tripStatus: summary.status,
    visibility: summary.visibility,
    version: summary.version,
    currentSnapshotId: summary.currentSnapshotId,
    memberCount: summary.memberCount,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    lastRefinedAt: summary.lastRefinedAt,
    archivedAt: summary.archivedAt,
    joinedAt: member.joinedAt,
  };
}

function buildUpdatedSummary(
  summary: TripSummaryDoc,
  itinerary: TravelItinerary,
  options: {
    incrementMessageCount: boolean;
    lastManualEditAt?: string;
    lastRefinedAt?: string;
    now: string;
    snapshotId: string;
  },
): TripSummaryDoc {
  return {
    ...summary,
    title: itinerary.title,
    destination: itinerary.destination,
    overview: itinerary.overview,
    totalDays: itinerary.totalDays,
    totalBudget: itinerary.totalBudget,
    currency: itinerary.currency,
    status: summary.archivedAt || summary.status === 'archived' ? 'archived' : 'ready',
    version: summary.version + 1,
    currentSnapshotId: options.snapshotId,
    messageCount: summary.messageCount + (options.incrementMessageCount ? 1 : 0),
    activityCount: countActivities(itinerary),
    updatedAt: options.now,
    lastRefinedAt: options.lastRefinedAt ?? summary.lastRefinedAt,
    lastManualEditAt: options.lastManualEditAt ?? summary.lastManualEditAt,
  };
}

function normalizeItineraryForStorage(
  itinerary: z.infer<typeof travelItinerarySchema>,
): TravelItinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => ({
        ...activity,
        id: activity.id ?? createPrefixedId('activity'),
      })),
    })),
  };
}

function mapTripSummary(
  tripId: string,
  summary: TripSummaryDoc,
  accessRole: TripSummaryResponse['accessRole'],
): TripSummaryResponse {
  return {
    id: tripId,
    ownerId: summary.ownerId,
    title: summary.title,
    destination: summary.destination,
    overview: summary.overview,
    totalDays: summary.totalDays,
    totalBudget: summary.totalBudget,
    currency: summary.currency,
    status: summary.status,
    visibility: summary.visibility,
    accessRole,
    memberCount: summary.memberCount,
    version: summary.version,
    currentSnapshotId: summary.currentSnapshotId,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    lastRefinedAt: summary.lastRefinedAt,
    archivedAt: summary.archivedAt,
  };
}

function mapMirrorSummary(mirror: TripMembershipMirrorDoc): TripSummaryResponse {
  return {
    id: mirror.tripId,
    ownerId: mirror.ownerId,
    title: mirror.title,
    destination: mirror.destination,
    overview: mirror.overview,
    totalDays: mirror.totalDays,
    totalBudget: mirror.totalBudget,
    currency: mirror.currency,
    status: mirror.tripStatus,
    visibility: mirror.visibility,
    accessRole: mirror.role,
    memberCount: mirror.memberCount,
    version: mirror.version,
    currentSnapshotId: mirror.currentSnapshotId,
    createdAt: mirror.createdAt,
    updatedAt: mirror.updatedAt,
    lastRefinedAt: mirror.lastRefinedAt,
    archivedAt: mirror.archivedAt,
  };
}

function decodeCursor(cursor: string | undefined): { id: string; updatedAt: string } | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(atob(cursor)) as { id?: string; updatedAt?: string };
    if (!parsed.id || !parsed.updatedAt) {
      return null;
    }

    return { id: parsed.id, updatedAt: parsed.updatedAt };
  } catch {
    throw new AppError(422, 'validation_error', 'Cursor is invalid.');
  }
}

function encodeCursor(summary: TripSummaryResponse): string {
  return btoa(
    JSON.stringify({
      id: summary.id,
      updatedAt: summary.updatedAt,
    }),
  );
}

function decodeMessageCursor(cursor: string | undefined): { createdAt: string; id: string } | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(atob(cursor)) as { createdAt?: string; id?: string };
    if (!parsed.createdAt || !parsed.id) {
      return null;
    }

    return {
      id: parsed.id,
      createdAt: parsed.createdAt,
    };
  } catch {
    throw new AppError(422, 'validation_error', 'Cursor is invalid.');
  }
}

function encodeMessageCursor(message: TripMessageResponse): string {
  return btoa(
    JSON.stringify({
      id: message.id,
      createdAt: message.createdAt,
    }),
  );
}

function sortSummariesDescending(left: TripSummaryResponse, right: TripSummaryResponse): number {
  if (left.updatedAt !== right.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt);
  }

  return right.id.localeCompare(left.id);
}

function afterCursor(cursor: { id: string; updatedAt: string } | null, summary: TripSummaryResponse): boolean {
  if (!cursor) {
    return true;
  }

  if (summary.updatedAt === cursor.updatedAt) {
    return summary.id.localeCompare(cursor.id) < 0;
  }

  return summary.updatedAt.localeCompare(cursor.updatedAt) < 0;
}

function afterMessageCursor(
  cursor: { createdAt: string; id: string } | null,
  message: TripMessageResponse,
): boolean {
  if (!cursor) {
    return true;
  }

  if (message.createdAt === cursor.createdAt) {
    return message.id.localeCompare(cursor.id) < 0;
  }

  return message.createdAt.localeCompare(cursor.createdAt) < 0;
}

export class TripsService {
  constructor(
    private readonly repository: TripsRepository,
    private readonly itineraryProvider: ItineraryProvider,
  ) {}

  parseCreateTripInput(input: unknown): CreateTripInput {
    const parsed = createTripSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', 'Request validation failed.', parsed.error.flatten());
    }

    return parsed.data;
  }

  parseListTripsQuery(input: unknown) {
    const parsed = listTripsQuerySchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', 'Query validation failed.', parsed.error.flatten());
    }

    return parsed.data;
  }

  parseDetailQuery(input: unknown) {
    const parsed = detailQuerySchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', 'Query validation failed.', parsed.error.flatten());
    }

    return parsed.data;
  }

  parseRefineTripInput(input: unknown): RefineTripInput {
    const parsed = refineTripSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', 'Request validation failed.', parsed.error.flatten());
    }

    return parsed.data;
  }

  parseReplaceItineraryInput(input: unknown): ReplaceTripItineraryInput {
    const parsed = replaceItinerarySchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', 'Request validation failed.', parsed.error.flatten());
    }

    return {
      expectedVersion: parsed.data.expectedVersion,
      itinerary: normalizeItineraryForStorage(parsed.data.itinerary),
    };
  }

  parsePatchTripInput(input: unknown): PatchTripInput {
    const parsed = patchTripSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', 'Request validation failed.', parsed.error.flatten());
    }

    return parsed.data;
  }

  parseListMessagesQuery(input: unknown) {
    const parsed = listMessagesQuerySchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', 'Query validation failed.', parsed.error.flatten());
    }

    return parsed.data;
  }

  async createTrip(user: AuthUser, input: CreateTripInput): Promise<TripDetailResult> {
    const existingUser = await this.repository.getUser(user.uid);
    const now = nowIsoString();
    const email = requireUserEmail(user, existingUser);
    const displayName = getDisplayName(user, existingUser);
    const itinerary = await this.itineraryProvider.generateOrRefine(input.prompt);

    const tripId = createPrefixedId('trip');
    const snapshotId = createPrefixedId('snap');
    const messageId = createPrefixedId('msg');

    const summary: TripSummaryDoc = {
      ownerId: user.uid,
      title: itinerary.title,
      destination: itinerary.destination,
      overview: itinerary.overview,
      totalDays: itinerary.totalDays,
      totalBudget: itinerary.totalBudget,
      currency: itinerary.currency,
      status: 'ready',
      visibility: 'private',
      version: 1,
      currentSnapshotId: snapshotId,
      memberCount: 1,
      messageCount: 1,
      activityCount: countActivities(itinerary),
      createdAt: now,
      updatedAt: now,
      lastRefinedAt: null,
      lastManualEditAt: null,
      archivedAt: null,
    };

    const member: TripMemberDoc = {
      userId: user.uid,
      role: 'owner',
      status: 'active',
      displayName,
      email,
      joinedAt: now,
      invitedBy: user.uid,
    };

    const snapshot: SnapshotDoc = {
      tripId,
      version: 1,
      source: 'create',
      prompt: input.prompt,
      createdAt: now,
      createdBy: user.uid,
      itinerary,
    };

    const initialMessage: MessageDoc = {
      role: 'user',
      text: input.prompt,
      createdAt: now,
      snapshotId,
      requestId: input.clientRequestId ?? null,
    };

    const mirror: TripMembershipMirrorDoc = {
      tripId,
      ownerId: user.uid,
      role: 'owner',
      status: 'active',
      title: itinerary.title,
      destination: itinerary.destination,
      overview: itinerary.overview,
      totalDays: itinerary.totalDays,
      totalBudget: itinerary.totalBudget,
      currency: itinerary.currency,
      tripStatus: 'ready',
      visibility: 'private',
      version: 1,
      currentSnapshotId: snapshotId,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
      lastRefinedAt: null,
      archivedAt: null,
      joinedAt: now,
    };

    const userProfile: UserProfileDoc = {
      displayName,
      email,
      photoURL: user.photoURL ?? existingUser?.photoURL ?? null,
      travelerName: existingUser?.travelerName ?? null,
      ownedTripCount: (existingUser?.ownedTripCount ?? 0) + 1,
      sharedTripCount: existingUser?.sharedTripCount ?? 0,
      createdAt: existingUser?.createdAt ?? now,
      updatedAt: now,
      lastSeenAt: now,
    };

    await this.repository.createTripBundle({
      messageId,
      tripId,
      summary,
      member,
      snapshot,
      initialMessage,
      mirror,
      user: userProfile,
    });

    const responseSummary = mapTripSummary(tripId, summary, 'owner');

    return {
      id: tripId,
      summary: responseSummary,
      permissions: buildPermissions('owner'),
      currentItinerary: itinerary,
      recentMessages: [
        {
          id: messageId,
          role: initialMessage.role,
          text: initialMessage.text,
          createdAt: initialMessage.createdAt,
          snapshotId: initialMessage.snapshotId,
        },
      ],
    };
  }

  async listTrips(
    userId: string,
    query: z.infer<typeof listTripsQuerySchema>,
  ): Promise<ListTripsResult> {
    const cursor = decodeCursor(query.cursor);
    const mirrors = await this.repository.listMembershipMirrors(userId, 200);

    const filtered = mirrors
      .filter((mirror) => mirror.status === 'active')
      .map((mirror) => mapMirrorSummary(mirror))
      .filter((summary) => {
        if (query.status === 'active' && summary.status === 'archived') {
          return false;
        }

        if (query.status === 'archived' && summary.status !== 'archived') {
          return false;
        }

        if (query.scope === 'owned' && summary.accessRole !== 'owner') {
          return false;
        }

        if (query.scope === 'shared' && summary.accessRole === 'owner') {
          return false;
        }

        return afterCursor(cursor, summary);
      })
      .sort(sortSummariesDescending);

    const page = filtered.slice(0, query.limit + 1);
    const hasMore = page.length > query.limit;
    const data = (hasMore ? page.slice(0, query.limit) : page);

    return {
      data,
      meta: {
        limit: query.limit,
        nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null,
      },
    };
  }

  async getTripDetail(
    userId: string,
    tripId: string,
    options: GetTripDetailOptions,
  ): Promise<TripDetailResult> {
    const [summary, membership] = await Promise.all([
      this.repository.getTripSummary(tripId),
      this.repository.getTripMember(tripId, userId),
    ]);

    if (!summary) {
      throw new AppError(404, 'trip_not_found', 'Trip not found.');
    }

    const activeMembership = requireActiveMembership(membership);

    const snapshot = await this.repository.getSnapshot(tripId, summary.currentSnapshotId);
    if (!snapshot) {
      throw new AppError(500, 'internal_error', 'Trip snapshot is missing.');
    }

    const recentMessages = options.includeMessages
      ? (await this.repository.listMessages(tripId, options.messageLimit))
          .reverse()
          .map(({ id, message }) => ({
            id,
            role: message.role,
            text: message.text,
            createdAt: message.createdAt,
            snapshotId: message.snapshotId,
          }))
      : [];

    const members = options.includeMembers
      ? (await this.repository.listMembers(tripId))
          .filter((member) => member.status === 'active')
          .map<TripMemberResponse>((member) => ({
            userId: member.userId,
            displayName: member.displayName,
            email: member.email,
            role: member.role,
            status: member.status,
            joinedAt: member.joinedAt,
            invitedBy: member.invitedBy,
          }))
      : undefined;

    const responseSummary = mapTripSummary(tripId, summary, activeMembership.role);

    return {
      id: tripId,
      summary: responseSummary,
      permissions: buildPermissions(activeMembership.role),
      currentItinerary: snapshot.itinerary,
      recentMessages,
      members,
    };
  }

  async getPublicTripDetail(tripId: string): Promise<PublicTripResponse> {
    const summary = await this.repository.getTripSummary(tripId);

    if (!summary || summary.visibility !== 'shared' || summary.archivedAt !== null) {
      throw new AppError(404, 'not_found', 'Trip not found.');
    }

    const snapshot = await this.repository.getSnapshot(tripId, summary.currentSnapshotId);
    if (!snapshot) {
      throw new AppError(500, 'internal_error', 'Trip snapshot is missing.');
    }

    return {
      id: tripId,
      title: summary.title,
      destination: summary.destination,
      overview: summary.overview,
      totalDays: summary.totalDays,
      totalBudget: summary.totalBudget,
      currency: summary.currency,
      days: snapshot.itinerary.days,
      budgetBreakdown: snapshot.itinerary.budgetBreakdown,
    };
  }

  private async loadEditableTrip(userId: string, tripId: string): Promise<EditableTripContext> {
    const [summaryDocument, membership, members] = await Promise.all([
      this.repository.getTripSummaryDocument(tripId),
      this.repository.getTripMember(tripId, userId),
      this.repository.listMembers(tripId),
    ]);

    if (!summaryDocument) {
      throw new AppError(404, 'trip_not_found', 'Trip not found.');
    }

    const editableMembership = requireEditableMembership(membership);

    return {
      summary: summaryDocument.data,
      summaryUpdateTime: summaryDocument.updateTime,
      membership: editableMembership,
      activeMembers: members.filter((member) => member.status === 'active'),
    };
  }

  async refineTrip(userId: string, tripId: string, input: RefineTripInput): Promise<TripDetailResult> {
    const editableTrip = await this.loadEditableTrip(userId, tripId);
    assertExpectedVersion(input.expectedVersion, editableTrip.summary.version);

    const currentSnapshot = await this.repository.getSnapshot(tripId, editableTrip.summary.currentSnapshotId);
    if (!currentSnapshot) {
      throw new AppError(500, 'internal_error', 'Trip snapshot is missing.');
    }

    const priorMessages = (await this.repository.listMessages(tripId, REFINEMENT_HISTORY_LIMIT)).reverse();
    const nextItinerary = await this.itineraryProvider.generateOrRefine(
      input.prompt,
      priorMessages.map(({ message }) => ({
        role: message.role,
        text: message.text,
      })),
      currentSnapshot.itinerary,
    );
    assertRefinementStaysOnCurrentTrip(currentSnapshot.itinerary, nextItinerary);

    const now = nowIsoString();
    const snapshotId = createPrefixedId('snap');
    const messageId = createPrefixedId('msg');
    const nextSummary = buildUpdatedSummary(editableTrip.summary, nextItinerary, {
      incrementMessageCount: true,
      lastRefinedAt: now,
      now,
      snapshotId,
    });
    const snapshot: SnapshotDoc = {
      tripId,
      version: nextSummary.version,
      source: 'refine',
      prompt: input.prompt,
      createdAt: now,
      createdBy: userId,
      itinerary: nextItinerary,
    };
    const message: MessageDoc = {
      role: 'user',
      text: input.prompt,
      createdAt: now,
      snapshotId,
      requestId: input.clientRequestId ?? null,
    };

    await this.repository.commitTripRevision({
      tripId,
      summary: nextSummary,
      summaryUpdateTime: editableTrip.summaryUpdateTime,
      snapshotId,
      snapshot,
      messageId,
      message,
      membershipMirrors: editableTrip.activeMembers.map((member) => ({
        userId: member.userId,
        mirror: buildMembershipMirror(tripId, nextSummary, member),
      })),
    });

    const recentMessages = [
      ...priorMessages.map(({ id, message: existingMessage }) => toTripMessageResponse(id, existingMessage)),
      toTripMessageResponse(messageId, message),
    ].slice(-REFINEMENT_HISTORY_LIMIT);

    return {
      id: tripId,
      summary: mapTripSummary(tripId, nextSummary, editableTrip.membership.role),
      permissions: buildPermissions(editableTrip.membership.role),
      currentItinerary: nextItinerary,
      recentMessages,
    };
  }

  async replaceTripItinerary(
    userId: string,
    tripId: string,
    input: ReplaceTripItineraryInput,
  ): Promise<TripDetailResult> {
    const editableTrip = await this.loadEditableTrip(userId, tripId);
    assertExpectedVersion(input.expectedVersion, editableTrip.summary.version);

    const now = nowIsoString();
    const snapshotId = createPrefixedId('snap');
    const nextSummary = buildUpdatedSummary(editableTrip.summary, input.itinerary, {
      incrementMessageCount: false,
      lastManualEditAt: now,
      now,
      snapshotId,
    });
    const snapshot: SnapshotDoc = {
      tripId,
      version: nextSummary.version,
      source: 'manual_edit',
      prompt: null,
      createdAt: now,
      createdBy: userId,
      itinerary: input.itinerary,
    };

    await this.repository.commitTripRevision({
      tripId,
      summary: nextSummary,
      summaryUpdateTime: editableTrip.summaryUpdateTime,
      snapshotId,
      snapshot,
      membershipMirrors: editableTrip.activeMembers.map((member) => ({
        userId: member.userId,
        mirror: buildMembershipMirror(tripId, nextSummary, member),
      })),
    });

    return {
      id: tripId,
      summary: mapTripSummary(tripId, nextSummary, editableTrip.membership.role),
      permissions: buildPermissions(editableTrip.membership.role),
      currentItinerary: input.itinerary,
      recentMessages: [],
    };
  }

  async patchTrip(
    userId: string,
    tripId: string,
    input: PatchTripInput,
  ): Promise<TripDetailResult> {
    const [summaryDocument, membership] = await Promise.all([
      this.repository.getTripSummaryDocument(tripId),
      this.repository.getTripMember(tripId, userId),
    ]);

    if (!summaryDocument) {
      throw new AppError(404, 'trip_not_found', 'Trip not found.');
    }

    requireOwnerMembership(membership);
    assertExpectedVersion(input.expectedVersion, summaryDocument.data.version);

    const summary = summaryDocument.data;
    const nextVisibility = input.visibility ?? summary.visibility;
    const shouldArchive = input.archived ?? (summary.archivedAt !== null);

    if (nextVisibility === 'private' && summary.memberCount > 1) {
      throw new AppError(422, 'validation_error', 'Private trips cannot have multiple active members.');
    }

    const now = nowIsoString();
    const nextSummary: TripSummaryDoc = {
      ...summary,
      title: input.title ?? summary.title,
      visibility: nextVisibility,
      status: shouldArchive ? 'archived' : 'ready',
      archivedAt: shouldArchive ? summary.archivedAt ?? now : null,
      version: summary.version + 1,
      updatedAt: now,
    };
    const members = (await this.repository.listMembers(tripId)).filter((member) => member.status === 'active');

    await this.repository.commitTripMutation({
      tripId,
      summary: nextSummary,
      summaryUpdateTime: summaryDocument.updateTime,
      membershipMirrorUpserts: members.map((member) => ({
        userId: member.userId,
        mirror: buildMembershipMirror(tripId, nextSummary, member),
      })),
    });

    const snapshot = await this.repository.getSnapshot(tripId, nextSummary.currentSnapshotId);
    if (!snapshot) {
      throw new AppError(500, 'internal_error', 'Trip snapshot is missing.');
    }

    return {
      id: tripId,
      summary: mapTripSummary(tripId, nextSummary, 'owner'),
      permissions: buildPermissions('owner'),
      currentItinerary: snapshot.itinerary,
      recentMessages: [],
    };
  }

  async listTripMessages(
    userId: string,
    tripId: string,
    query: z.infer<typeof listMessagesQuerySchema>,
  ): Promise<ListMessagesResult> {
    const [summary, membership] = await Promise.all([
      this.repository.getTripSummary(tripId),
      this.repository.getTripMember(tripId, userId),
    ]);

    if (!summary) {
      throw new AppError(404, 'trip_not_found', 'Trip not found.');
    }

    requireActiveMembership(membership);

    const cursor = decodeMessageCursor(query.cursor);
    const filteredMessages = (await this.repository.listMessages(tripId, 200))
      .map(({ id, message }) => toTripMessageResponse(id, message))
      .filter((message) => afterMessageCursor(cursor, message));

    const page = filteredMessages.slice(0, query.limit + 1);
    const hasMore = page.length > query.limit;
    const selected = hasMore ? page.slice(0, query.limit) : page;

    return {
      data: [...selected].reverse(),
      meta: {
        limit: query.limit,
        nextCursor: hasMore ? encodeMessageCursor(selected[selected.length - 1]) : null,
      },
    };
  }

  async deleteTrip(userId: string, tripId: string): Promise<void> {
    const [summaryDocument, membership, members, snapshots, messages] = await Promise.all([
      this.repository.getTripSummaryDocument(tripId),
      this.repository.getTripMember(tripId, userId),
      this.repository.listMembers(tripId),
      this.repository.listSnapshots(tripId, 500),
      this.repository.listMessages(tripId, 500),
    ]);

    if (!summaryDocument) {
      throw new AppError(404, 'trip_not_found', 'Trip not found.');
    }

    requireOwnerMembership(membership);

    const activeMembers = members.filter((member) => member.status === 'active');
    const userProfiles = await Promise.all(
      activeMembers.map(async (member) => ({
        user: await this.repository.getUser(member.userId),
        userId: member.userId,
      })),
    );
    const now = nowIsoString();

    await this.repository.commitTripMutation({
      tripId,
      deleteTrip: true,
      memberDeletes: members.map((member) => member.userId),
      membershipMirrorDeletes: members.map((member) => member.userId),
      snapshotDeletes: snapshots.map((snapshot) => snapshot.id),
      messageDeletes: messages.map((message) => message.id),
      userProfileUpserts: userProfiles.flatMap(({ user, userId: memberUserId }) => {
        if (!user) {
          return [];
        }

        if (memberUserId === summaryDocument.data.ownerId) {
          return [
            {
              userId: memberUserId,
              user: {
                ...user,
                ownedTripCount: Math.max(0, user.ownedTripCount - 1),
                updatedAt: now,
              },
            },
          ];
        }

        return [
          {
            userId: memberUserId,
            user: {
              ...user,
              sharedTripCount: Math.max(0, user.sharedTripCount - 1),
              updatedAt: now,
            },
          },
        ];
      }),
    });
  }
}
