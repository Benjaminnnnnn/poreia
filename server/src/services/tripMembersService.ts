import { z } from 'zod';
import { AppError } from '../core/errors';
import { nowIsoString } from '../core/time';
import { TripsRepository, type UserRecord } from '../firestore/tripsRepository';
import type {
  TripMemberDoc,
  TripMemberResponse,
  TripMembershipMirrorDoc,
  TripSummaryDoc,
  TripSummaryResponse,
  TripVisibility,
  UserProfileDoc,
} from '../types/domain';

const addMemberSchema = z
  .object({
    email: z.string().email().optional(),
    role: z.enum(['editor', 'viewer']),
    userId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.userId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either userId or email is required.',
        path: ['userId'],
      });
    }

    if (value.email && value.userId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either userId or email, not both.',
        path: ['userId'],
      });
    }
  });

const updateMemberSchema = z
  .object({
    revoked: z.boolean().optional(),
    role: z.enum(['editor', 'viewer']).optional(),
  })
  .superRefine((value, context) => {
    if (value.role === undefined && value.revoked !== true) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either role or revoked=true is required.',
        path: ['role'],
      });
    }
  });

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

function mapMember(member: TripMemberDoc): TripMemberResponse {
  return {
    userId: member.userId,
    displayName: member.displayName,
    email: member.email,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt,
    invitedBy: member.invitedBy,
  };
}

function buildMembershipMirror(
  tripId: string,
  summary: TripSummaryDoc,
  member: TripMemberDoc,
): TripMembershipMirrorDoc {
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

function requireOwner(membership: TripMemberDoc | null): TripMemberDoc {
  if (!membership || membership.status !== 'active' || membership.role !== 'owner') {
    throw new AppError(403, 'forbidden', 'You do not have permission to manage trip members.');
  }

  return membership;
}

function assertTripExists(summary: TripSummaryDoc | null): TripSummaryDoc {
  if (!summary) {
    throw new AppError(404, 'trip_not_found', 'Trip not found.');
  }

  return summary;
}

function incrementSharedTripCount(user: UserProfileDoc, now: string): UserProfileDoc {
  return {
    ...user,
    sharedTripCount: user.sharedTripCount + 1,
    updatedAt: now,
  };
}

function decrementSharedTripCount(user: UserProfileDoc, now: string): UserProfileDoc {
  return {
    ...user,
    sharedTripCount: Math.max(0, user.sharedTripCount - 1),
    updatedAt: now,
  };
}

function nextSummaryForMembershipChange(
  summary: TripSummaryDoc,
  now: string,
  options: {
    memberCountDelta: -1 | 0 | 1;
    visibility?: TripVisibility;
  },
): TripSummaryDoc {
  return {
    ...summary,
    memberCount: summary.memberCount + options.memberCountDelta,
    visibility: options.visibility ?? summary.visibility,
    version: summary.version + 1,
    updatedAt: now,
  };
}

export class TripMembersService {
  constructor(private readonly repository: TripsRepository) {}

  parseAddMemberInput(input: unknown) {
    const parsed = addMemberSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', 'Request validation failed.', parsed.error.flatten());
    }

    return parsed.data;
  }

  parseUpdateMemberInput(input: unknown) {
    const parsed = updateMemberSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(422, 'validation_error', 'Request validation failed.', parsed.error.flatten());
    }

    return parsed.data;
  }

  private async resolveTargetUser(input: { email?: string; userId?: string }): Promise<UserRecord> {
    const resolvedUser = input.userId
      ? await this.repository.getUserRecord(input.userId)
      : await this.repository.findUserByEmail(input.email ?? '');

    if (!resolvedUser) {
      throw new AppError(404, 'user_not_found', 'User not found.');
    }

    return resolvedUser;
  }

  async listMembers(userId: string, tripId: string): Promise<TripMemberResponse[]> {
    const [summary, membership, members] = await Promise.all([
      this.repository.getTripSummary(tripId),
      this.repository.getTripMember(tripId, userId),
      this.repository.listMembers(tripId),
    ]);

    assertTripExists(summary);
    requireOwner(membership);

    return members.filter((member) => member.status === 'active').map(mapMember);
  }

  async addMember(
    requesterUserId: string,
    tripId: string,
    input: z.infer<typeof addMemberSchema>,
  ): Promise<{
    member: TripMemberResponse;
    summary: TripSummaryResponse;
  }> {
    const [summaryDocument, requesterMembership, members, targetUser] = await Promise.all([
      this.repository.getTripSummaryDocument(tripId),
      this.repository.getTripMember(tripId, requesterUserId),
      this.repository.listMembers(tripId),
      this.resolveTargetUser(input),
    ]);

    const summary = assertTripExists(summaryDocument?.data ?? null);
    requireOwner(requesterMembership);

    if (targetUser.userId === summary.ownerId) {
      throw new AppError(409, 'member_exists', 'The owner is already a member.');
    }

    const existingMember = members.find((member) => member.userId === targetUser.userId) ?? null;
    if (existingMember?.status === 'active') {
      throw new AppError(409, 'member_exists', 'User is already a trip member.');
    }

    const now = nowIsoString();
    const nextSummary = nextSummaryForMembershipChange(summary, now, {
      memberCountDelta: 1,
      visibility: summary.visibility === 'private' ? 'shared' : summary.visibility,
    });
    const member: TripMemberDoc = {
      userId: targetUser.userId,
      role: input.role,
      status: 'active',
      displayName: targetUser.user.displayName,
      email: targetUser.user.email,
      joinedAt: now,
      invitedBy: requesterUserId,
    };
    const activeMembers = [
      ...members.filter((existing) => existing.status === 'active' && existing.userId !== targetUser.userId),
      member,
    ];

    await this.repository.commitTripMutation({
      tripId,
      summary: nextSummary,
      summaryUpdateTime: summaryDocument?.updateTime,
      memberUpserts: [
        {
          member,
          currentDocument: existingMember ? undefined : { exists: false },
        },
      ],
      membershipMirrorUpserts: activeMembers.map((activeMember) => ({
        userId: activeMember.userId,
        mirror: buildMembershipMirror(tripId, nextSummary, activeMember),
        currentDocument:
          activeMember.userId === targetUser.userId && !existingMember
            ? { exists: false }
            : undefined,
      })),
      userProfileUpserts: [
        {
          userId: targetUser.userId,
          user: incrementSharedTripCount(targetUser.user, now),
        },
      ],
    });

    return {
      member: mapMember(member),
      summary: mapTripSummary(tripId, nextSummary, 'owner'),
    };
  }

  async updateMember(
    requesterUserId: string,
    tripId: string,
    targetUserId: string,
    input: z.infer<typeof updateMemberSchema>,
  ): Promise<{
    member: TripMemberResponse;
    summary: TripSummaryResponse;
  }> {
    const [summaryDocument, requesterMembership, members, targetUser] = await Promise.all([
      this.repository.getTripSummaryDocument(tripId),
      this.repository.getTripMember(tripId, requesterUserId),
      this.repository.listMembers(tripId),
      this.repository.getUser(targetUserId),
    ]);

    const summary = assertTripExists(summaryDocument?.data ?? null);
    requireOwner(requesterMembership);

    const existingMember = members.find((member) => member.userId === targetUserId) ?? null;
    if (!existingMember || existingMember.status !== 'active' || existingMember.role === 'owner') {
      throw new AppError(404, 'member_not_found', 'Member not found.');
    }

    const roleChanged = input.role !== undefined && input.role !== existingMember.role;
    const revokeMember = input.revoked === true;
    if (!roleChanged && !revokeMember) {
      return {
        member: mapMember(existingMember),
        summary: mapTripSummary(tripId, summary, 'owner'),
      };
    }

    const now = nowIsoString();
    const nextSummary = nextSummaryForMembershipChange(summary, now, {
      memberCountDelta: revokeMember ? -1 : 0,
    });
    const updatedMember: TripMemberDoc = {
      ...existingMember,
      role: input.role ?? existingMember.role,
      status: revokeMember ? 'revoked' : existingMember.status,
    };
    const activeMembers = members
      .filter((member) => member.status === 'active' && member.userId !== targetUserId)
      .concat(revokeMember ? [] : [updatedMember]);

    await this.repository.commitTripMutation({
      tripId,
      summary: nextSummary,
      summaryUpdateTime: summaryDocument?.updateTime,
      memberUpserts: [{ member: updatedMember }],
      membershipMirrorUpserts: [
        ...activeMembers.map((member) => ({
          userId: member.userId,
          mirror: buildMembershipMirror(tripId, nextSummary, member),
        })),
        ...(revokeMember
          ? [
              {
                userId: updatedMember.userId,
                mirror: buildMembershipMirror(tripId, nextSummary, updatedMember),
              },
            ]
          : []),
      ],
      userProfileUpserts:
        revokeMember && targetUser
          ? [
              {
                userId: targetUserId,
                user: decrementSharedTripCount(targetUser, now),
              },
            ]
          : undefined,
    });

    return {
      member: mapMember(updatedMember),
      summary: mapTripSummary(tripId, nextSummary, 'owner'),
    };
  }

  async removeMember(requesterUserId: string, tripId: string, targetUserId: string): Promise<void> {
    const [summaryDocument, requesterMembership, members, targetUser] = await Promise.all([
      this.repository.getTripSummaryDocument(tripId),
      this.repository.getTripMember(tripId, requesterUserId),
      this.repository.listMembers(tripId),
      this.repository.getUser(targetUserId),
    ]);

    const summary = assertTripExists(summaryDocument?.data ?? null);
    requireOwner(requesterMembership);

    const existingMember = members.find((member) => member.userId === targetUserId) ?? null;
    if (!existingMember || existingMember.status !== 'active' || existingMember.role === 'owner') {
      throw new AppError(404, 'member_not_found', 'Member not found.');
    }

    const now = nowIsoString();
    const nextSummary = nextSummaryForMembershipChange(summary, now, {
      memberCountDelta: -1,
    });
    const activeMembers = members.filter(
      (member) => member.status === 'active' && member.userId !== targetUserId,
    );

    await this.repository.commitTripMutation({
      tripId,
      summary: nextSummary,
      summaryUpdateTime: summaryDocument?.updateTime,
      memberDeletes: [targetUserId],
      membershipMirrorDeletes: [targetUserId],
      membershipMirrorUpserts: activeMembers.map((member) => ({
        userId: member.userId,
        mirror: buildMembershipMirror(tripId, nextSummary, member),
      })),
      userProfileUpserts:
        targetUser
          ? [
              {
                userId: targetUserId,
                user: decrementSharedTripCount(targetUser, now),
              },
            ]
          : undefined,
    });
  }
}
