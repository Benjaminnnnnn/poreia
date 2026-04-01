import { beforeEach, describe, expect, it } from 'vitest';
import type {
  MessageDoc,
  SnapshotDoc,
  TripMemberDoc,
  TripMembershipMirrorDoc,
  TripSummaryDoc,
  UserProfileDoc,
} from '../../src/types/domain';
import {
  appRequest,
  createSeedTrip,
  resetEmulator,
  testUserHeader,
  tripsRepository,
  upsertTripMessages,
  upsertUser,
} from '../helpers/emulator';

const ownerId = 'user_owner';
const collaboratorId = 'user_collab';
const tripId = 'trip_test_001';
const snapshotId = 'snap_test_001';
const messageId = 'msg_test_001';

function baseOwnerUser(now: string): UserProfileDoc {
  return {
    displayName: 'Owner User',
    email: 'owner@example.com',
    photoURL: null,
    travelerName: null,
    ownedTripCount: 1,
    sharedTripCount: 0,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
  };
}

function collaboratorUser(now: string): UserProfileDoc {
  return {
    displayName: 'Collab User',
    email: 'collab@example.com',
    photoURL: null,
    travelerName: null,
    ownedTripCount: 0,
    sharedTripCount: 0,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
  };
}

async function seedBaseTrip(): Promise<void> {
  const now = '2026-04-01T12:00:00.000Z';
  const summary: TripSummaryDoc = {
    ownerId,
    title: 'Tokyo Test Trip',
    destination: 'Tokyo, Japan',
    overview: 'Seeded itinerary for integration tests.',
    totalDays: 3,
    totalBudget: 1200,
    currency: 'USD',
    status: 'ready',
    visibility: 'private',
    version: 1,
    currentSnapshotId: snapshotId,
    memberCount: 1,
    messageCount: 1,
    activityCount: 2,
    createdAt: now,
    updatedAt: now,
    lastRefinedAt: null,
    lastManualEditAt: null,
    archivedAt: null,
  };
  const member: TripMemberDoc = {
    userId: ownerId,
    role: 'owner',
    status: 'active',
    displayName: 'Owner User',
    email: 'owner@example.com',
    joinedAt: now,
    invitedBy: ownerId,
  };
  const snapshot: SnapshotDoc = {
    tripId,
    version: 1,
    source: 'create',
    prompt: 'Plan a Tokyo trip.',
    createdAt: now,
    createdBy: ownerId,
    itinerary: {
      destination: 'Tokyo, Japan',
      title: 'Tokyo Test Trip',
      totalDays: 3,
      totalBudget: 1200,
      currency: 'USD',
      overview: 'Seeded itinerary for integration tests.',
      days: [
        {
          day: 1,
          theme: 'Arrival',
          activities: [
            {
              id: 'activity_1',
              time: '10:00',
              description: 'Arrive in Tokyo',
              location: 'Tokyo Station',
            },
          ],
        },
        {
          day: 2,
          theme: 'Food',
          activities: [
            {
              id: 'activity_2',
              time: '18:00',
              description: 'Dinner in Shinjuku',
              location: 'Shinjuku',
            },
          ],
        },
      ],
      budgetBreakdown: [
        { category: 'Food', amount: 400 },
        { category: 'Stay', amount: 800 },
      ],
    },
  };
  const initialMessage: MessageDoc = {
    role: 'user',
    text: 'Plan a Tokyo trip.',
    createdAt: now,
    snapshotId,
    requestId: 'req_test_001',
  };
  const mirror: TripMembershipMirrorDoc = {
    tripId,
    ownerId,
    role: 'owner',
    status: 'active',
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
    joinedAt: now,
  };

  await createSeedTrip({
    tripId,
    messageId,
    summary,
    member,
    snapshot,
    initialMessage,
    mirror,
    ownerUser: baseOwnerUser(now),
  });
}

describe('Trips API integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedBaseTrip();
    await upsertUser(collaboratorId, collaboratorUser('2026-04-01T12:00:00.000Z'));
  });

  it('creates a trip and lists it for the owner', async () => {
    const createResponse = await appRequest('/api/v1/trips', {
      method: 'POST',
      headers: testUserHeader({ uid: 'user_new_owner', email: 'new-owner@example.com' }),
      body: JSON.stringify({
        prompt: 'Plan me a Tokyo food trip',
        clientRequestId: '4f8bc2bb-75b1-4377-b1d5-35d780ca9ee7',
      }),
    });

    expect(createResponse.status).toBe(201);
    const createPayload = await createResponse.json() as {
      data: { id: string; summary: { title: string; accessRole: string; memberCount: number } };
    };
    expect(createPayload.data.summary.title).toBe('Tokyo Food Crawl');
    expect(createPayload.data.summary.accessRole).toBe('owner');
    expect(createPayload.data.summary.memberCount).toBe(1);

    const listResponse = await appRequest('/api/v1/trips?scope=owned&status=active', {
      headers: testUserHeader({ uid: 'user_new_owner', email: 'new-owner@example.com' }),
    });

    expect(listResponse.status).toBe(200);
    const listPayload = await listResponse.json() as {
      data: Array<{ id: string }>;
    };
    expect(listPayload.data.some((trip) => trip.id === createPayload.data.id)).toBe(true);
  });

  it('returns trip detail with members and messages included', async () => {
    const response = await appRequest(
      `/api/v1/trips/${tripId}?include=members&include=messages&messageLimit=5`,
      {
        headers: testUserHeader({ uid: ownerId, email: 'owner@example.com' }),
      },
    );

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      data: { members?: Array<{ userId: string }>; recentMessages: Array<{ id: string }> };
    };
    expect(payload.data.members?.map((member) => member.userId)).toEqual([ownerId]);
    expect(payload.data.recentMessages.map((message) => message.id)).toEqual([messageId]);
  });

  it('patches trip metadata and updates the summary', async () => {
    const response = await appRequest(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: testUserHeader({ uid: ownerId, email: 'owner@example.com' }),
      body: JSON.stringify({
        expectedVersion: 1,
        title: 'Tokyo Food Crawl',
        visibility: 'shared',
        archived: false,
      }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      data: { summary: { title: string; visibility: string; version: number } };
    };
    expect(payload.data.summary.title).toBe('Tokyo Food Crawl');
    expect(payload.data.summary.visibility).toBe('shared');
    expect(payload.data.summary.version).toBe(2);
  });

  it('lists messages with cursor pagination', async () => {
    await upsertTripMessages(tripId, [
      {
        messageId: 'msg_test_002',
        message: {
          role: 'user',
          text: 'Add sushi for day 2.',
          createdAt: '2026-04-01T12:05:00.000Z',
          snapshotId,
          requestId: 'req_test_002',
        },
      },
      {
        messageId: 'msg_test_003',
        message: {
          role: 'user',
          text: 'Add a late-night snack stop.',
          createdAt: '2026-04-01T12:10:00.000Z',
          snapshotId,
          requestId: 'req_test_003',
        },
      },
    ]);

    const firstPage = await appRequest(`/api/v1/trips/${tripId}/messages?limit=2`, {
      headers: testUserHeader({ uid: ownerId, email: 'owner@example.com' }),
    });

    expect(firstPage.status).toBe(200);
    const firstPayload = await firstPage.json() as {
      data: Array<{ id: string }>;
      meta: { nextCursor: string | null };
    };
    expect(firstPayload.data.map((message) => message.id)).toEqual(['msg_test_002', 'msg_test_003']);
    expect(firstPayload.meta.nextCursor).toBeTruthy();

    const secondPage = await appRequest(
      `/api/v1/trips/${tripId}/messages?limit=2&cursor=${encodeURIComponent(firstPayload.meta.nextCursor ?? '')}`,
      {
        headers: testUserHeader({ uid: ownerId, email: 'owner@example.com' }),
      },
    );

    expect(secondPage.status).toBe(200);
    const secondPayload = await secondPage.json() as {
      data: Array<{ id: string }>;
      meta: { nextCursor: string | null };
    };
    expect(secondPayload.data.map((message) => message.id)).toEqual(['msg_test_001']);
    expect(secondPayload.meta.nextCursor).toBeNull();
  });

  it('adds, updates, and removes a member through the API', async () => {
    const addResponse = await appRequest(`/api/v1/trips/${tripId}/members`, {
      method: 'POST',
      headers: testUserHeader({ uid: ownerId, email: 'owner@example.com' }),
      body: JSON.stringify({
        email: 'collab@example.com',
        role: 'editor',
      }),
    });

    expect(addResponse.status).toBe(201);
    const addPayload = await addResponse.json() as {
      data: { member: { userId: string; role: string }; summary: { memberCount: number; visibility: string } };
    };
    expect(addPayload.data.member.userId).toBe(collaboratorId);
    expect(addPayload.data.member.role).toBe('editor');
    expect(addPayload.data.summary.memberCount).toBe(2);
    expect(addPayload.data.summary.visibility).toBe('shared');

    const patchResponse = await appRequest(`/api/v1/trips/${tripId}/members/${collaboratorId}`, {
      method: 'PATCH',
      headers: testUserHeader({ uid: ownerId, email: 'owner@example.com' }),
      body: JSON.stringify({
        role: 'viewer',
      }),
    });

    expect(patchResponse.status).toBe(200);
    const patchPayload = await patchResponse.json() as { data: { member: { role: string } } };
    expect(patchPayload.data.member.role).toBe('viewer');

    const deleteResponse = await appRequest(`/api/v1/trips/${tripId}/members/${collaboratorId}`, {
      method: 'DELETE',
      headers: testUserHeader({ uid: ownerId, email: 'owner@example.com' }),
    });

    expect(deleteResponse.status).toBe(204);

    const membersResponse = await appRequest(`/api/v1/trips/${tripId}/members`, {
      headers: testUserHeader({ uid: ownerId, email: 'owner@example.com' }),
    });
    expect(membersResponse.status).toBe(200);
    const membersPayload = await membersResponse.json() as { data: Array<{ userId: string }> };
    expect(membersPayload.data.map((member) => member.userId)).toEqual([ownerId]);
  });

  it('deletes the trip and removes persisted documents', async () => {
    await appRequest(`/api/v1/trips/${tripId}/members`, {
      method: 'POST',
      headers: testUserHeader({ uid: ownerId, email: 'owner@example.com' }),
      body: JSON.stringify({
        userId: collaboratorId,
        role: 'editor',
      }),
    });

    const deleteResponse = await appRequest(`/api/v1/trips/${tripId}`, {
      method: 'DELETE',
      headers: testUserHeader({ uid: ownerId, email: 'owner@example.com' }),
    });

    expect(deleteResponse.status).toBe(204);
    await expect(tripsRepository.getTripSummary(tripId)).resolves.toBeNull();
    await expect(tripsRepository.getTripMember(tripId, ownerId)).resolves.toBeNull();
    await expect(tripsRepository.getTripMember(tripId, collaboratorId)).resolves.toBeNull();
  });
});
