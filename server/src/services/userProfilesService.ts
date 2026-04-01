import { z } from 'zod';
import { AppError } from '../core/errors';
import { nowIsoString } from '../core/time';
import { TripsRepository } from '../firestore/tripsRepository';
import type {
  AuthUser,
  UserProfileDoc,
  UserProfileResponse,
} from '../types/domain';

const updateUserProfileSchema = z.object({
  travelerName: z.string().trim().min(1).max(40),
});

function getDefaultDisplayName(
  user: AuthUser,
  existingUser: UserProfileDoc | null,
): string {
  return (
    user.displayName?.trim() ||
    existingUser?.travelerName ||
    existingUser?.displayName ||
    user.email?.split("@")[0] ||
    'Traveler'
  );
}

function requireUserEmail(
  user: AuthUser,
  existingUser: UserProfileDoc | null,
): string {
  const email = user.email?.trim() || existingUser?.email?.trim();

  if (!email) {
    throw new AppError(
      422,
      'validation_error',
      'Authenticated user is missing an email address.',
    );
  }

  return email;
}

function toUserProfileResponse(
  userId: string,
  profile: UserProfileDoc,
): UserProfileResponse {
  return {
    userId,
    displayName: profile.displayName,
    email: profile.email,
    photoURL: profile.photoURL,
    travelerName: profile.travelerName,
    ownedTripCount: profile.ownedTripCount,
    sharedTripCount: profile.sharedTripCount,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    lastSeenAt: profile.lastSeenAt,
  };
}

export class UserProfilesService {
  constructor(private readonly repository: TripsRepository) {}

  parseUpdateProfileInput(input: unknown) {
    const parsed = updateUserProfileSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        422,
        'validation_error',
        'Request validation failed.',
        parsed.error.flatten(),
      );
    }

    return parsed.data;
  }

  async getCurrentProfile(user: AuthUser): Promise<UserProfileResponse> {
    const profile = await this.ensureUserProfile(user);
    return toUserProfileResponse(user.uid, profile);
  }

  async updateCurrentProfile(
    user: AuthUser,
    input: z.infer<typeof updateUserProfileSchema>,
  ): Promise<UserProfileResponse> {
    const existingUser = await this.repository.getUser(user.uid);
    const now = nowIsoString();
    const nextProfile: UserProfileDoc = {
      displayName: getDefaultDisplayName(user, existingUser),
      email: requireUserEmail(user, existingUser),
      photoURL: user.photoURL ?? existingUser?.photoURL ?? null,
      travelerName: input.travelerName,
      ownedTripCount: existingUser?.ownedTripCount ?? 0,
      sharedTripCount: existingUser?.sharedTripCount ?? 0,
      createdAt: existingUser?.createdAt ?? now,
      updatedAt: now,
      lastSeenAt: now,
    };

    await this.repository.upsertUser(user.uid, nextProfile);

    return toUserProfileResponse(user.uid, nextProfile);
  }

  private async ensureUserProfile(user: AuthUser): Promise<UserProfileDoc> {
    const existingUser = await this.repository.getUser(user.uid);
    const now = nowIsoString();
    const nextProfile: UserProfileDoc = {
      displayName: getDefaultDisplayName(user, existingUser),
      email: requireUserEmail(user, existingUser),
      photoURL: user.photoURL ?? existingUser?.photoURL ?? null,
      travelerName: existingUser?.travelerName ?? null,
      ownedTripCount: existingUser?.ownedTripCount ?? 0,
      sharedTripCount: existingUser?.sharedTripCount ?? 0,
      createdAt: existingUser?.createdAt ?? now,
      updatedAt: now,
      lastSeenAt: now,
    };

    await this.repository.upsertUser(user.uid, nextProfile);

    return nextProfile;
  }
}
