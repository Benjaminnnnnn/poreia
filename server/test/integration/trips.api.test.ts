import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../../src/core/errors';
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
  createTestApp,
  resetEmulator,
  testUserHeader,
  tripsRepository,
  upsertTripMessages,
  upsertUser,
} from '../helpers/emulator';

const ownerId = 'user_owner';
const collaboratorId = 'user_collab';
const strangerId = 'user_stranger';
const tripId = 'trip_test_001';
const snapshotId = 'snap_test_001';
const messageId = 'msg_test_001';

function ownerHeaders(): HeadersInit {
  return testUserHeader({ uid: ownerId, email: 'owner@example.com' });
}

function collaboratorHeaders(): HeadersInit {
  return testUserHeader({ uid: collaboratorId, email: 'collab@example.com' });
}

function strangerHeaders(): HeadersInit {
  return testUserHeader({ uid: strangerId, email: 'stranger@example.com' });
}

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

function strangerUser(now: string): UserProfileDoc {
  return {
    displayName: 'Stranger User',
    email: 'stranger@example.com',
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
          mood: 'curious',
          notes: 'Start slow.',
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

async function expectApiError(response: Response, status: number, code: string): Promise<void> {
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code,
    },
  });
}

async function addCollaborator(role: 'editor' | 'viewer' = 'editor'): Promise<void> {
  const response = await appRequest(`/api/v1/trips/${tripId}/members`, {
    method: 'POST',
    headers: ownerHeaders(),
    body: JSON.stringify({
      email: 'collab@example.com',
      role,
    }),
  });

  expect(response.status).toBe(201);
}

function createProviderFailureApp(status: number, code: string, message: string) {
  return createTestApp({
    itineraryFactory: async () => {
      throw new AppError(status, code, message);
    },
  });
}

describe('Trips API integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedBaseTrip();
    await upsertUser(collaboratorId, collaboratorUser('2026-04-01T12:00:00.000Z'));
    await upsertUser(strangerId, strangerUser('2026-04-01T12:00:00.000Z'));
  });

  it('rejects requests without authentication', async () => {
    const response = await appRequest('/api/v1/trips');
    await expectApiError(response, 401, 'unauthorized');
  });

  it('creates trips and paginates the owner trip list', async () => {
    const createFirstResponse = await appRequest('/api/v1/trips', {
      method: 'POST',
      headers: testUserHeader({ uid: 'user_new_owner', email: 'new-owner@example.com' }),
      body: JSON.stringify({
        prompt: 'Plan me a Tokyo food trip',
        clientRequestId: '4f8bc2bb-75b1-4377-b1d5-35d780ca9ee7',
      }),
    });

    expect(createFirstResponse.status).toBe(201);
    const firstPayload = await createFirstResponse.json() as {
      data: { id: string; summary: { title: string; accessRole: string; memberCount: number } };
    };
    expect(firstPayload.data.summary.title).toBe('Tokyo Food Crawl');
    expect(firstPayload.data.summary.accessRole).toBe('owner');
    expect(firstPayload.data.summary.memberCount).toBe(1);

    const createSecondResponse = await appRequest('/api/v1/trips', {
      method: 'POST',
      headers: testUserHeader({ uid: 'user_new_owner', email: 'new-owner@example.com' }),
      body: JSON.stringify({
        prompt: 'Plan me a Kyoto culture trip',
        clientRequestId: '11111111-2222-4333-8444-555555555555',
      }),
    });

    expect(createSecondResponse.status).toBe(201);
    const secondPayload = await createSecondResponse.json() as {
      data: { id: string };
    };

    const firstPageResponse = await appRequest('/api/v1/trips?scope=owned&status=active&limit=1', {
      headers: testUserHeader({ uid: 'user_new_owner', email: 'new-owner@example.com' }),
    });

    expect(firstPageResponse.status).toBe(200);
    const firstPagePayload = await firstPageResponse.json() as {
      data: Array<{ id: string }>;
      meta: { nextCursor: string | null };
    };
    expect(firstPagePayload.data).toHaveLength(1);
    expect(firstPagePayload.meta.nextCursor).toBeTruthy();

    const secondPageResponse = await appRequest(
      `/api/v1/trips?scope=owned&status=active&limit=1&cursor=${encodeURIComponent(firstPagePayload.meta.nextCursor ?? '')}`,
      {
        headers: testUserHeader({ uid: 'user_new_owner', email: 'new-owner@example.com' }),
      },
    );

    expect(secondPageResponse.status).toBe(200);
    const secondPagePayload = await secondPageResponse.json() as {
      data: Array<{ id: string }>;
      meta: { nextCursor: string | null };
    };
    expect(secondPagePayload.data).toHaveLength(1);
    expect(secondPagePayload.meta.nextCursor).toBeNull();

    const listedIds = new Set([
      firstPagePayload.data[0]?.id,
      secondPagePayload.data[0]?.id,
    ]);
    expect(listedIds).toEqual(new Set([firstPayload.data.id, secondPayload.data.id]));
  });

  it('returns validation and provider failures when creating a trip', async () => {
    const validationResponse = await appRequest('/api/v1/trips', {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({
        prompt: '   ',
      }),
    });
    await expectApiError(validationResponse, 422, 'validation_error');

    const unrelatedPromptResponse = await appRequest(
      '/api/v1/trips',
      {
        method: 'POST',
        headers: ownerHeaders(),
        body: JSON.stringify({
          prompt: 'Write a TypeScript function for sorting arrays.',
        }),
      },
      createProviderFailureApp(422, 'invalid_trip_prompt', 'The request must be about planning or refining a trip.'),
    );
    await expectApiError(unrelatedPromptResponse, 422, 'invalid_trip_prompt');

    const nonsensePromptResponse = await appRequest(
      '/api/v1/trips',
      {
        method: 'POST',
        headers: ownerHeaders(),
        body: JSON.stringify({
          prompt: 'zzzzz zzzzz zzzzz zzzzz',
        }),
      },
      createProviderFailureApp(422, 'invalid_trip_prompt', 'The request does not describe a meaningful trip.'),
    );
    await expectApiError(nonsensePromptResponse, 422, 'invalid_trip_prompt');

    const unavailableResponse = await appRequest(
      '/api/v1/trips',
      {
        method: 'POST',
        headers: ownerHeaders(),
        body: JSON.stringify({
          prompt: 'Plan me a Tokyo food trip',
        }),
      },
      createProviderFailureApp(503, 'provider_unavailable', 'The itinerary service is down.'),
    );
    await expectApiError(unavailableResponse, 503, 'provider_unavailable');

    const invalidResponse = await appRequest(
      '/api/v1/trips',
      {
        method: 'POST',
        headers: ownerHeaders(),
        body: JSON.stringify({
          prompt: 'Plan me a Tokyo food trip',
        }),
      },
      createProviderFailureApp(502, 'provider_invalid_response', 'The itinerary service returned invalid JSON.'),
    );
    await expectApiError(invalidResponse, 502, 'provider_invalid_response');
  });

  it('rejects trip creation when the authenticated user has no email', async () => {
    const response = await appRequest('/api/v1/trips', {
      method: 'POST',
      headers: testUserHeader({ uid: 'user_without_email' }),
      body: JSON.stringify({
        prompt: 'Plan me a Tokyo food trip',
      }),
    });

    await expectApiError(response, 422, 'validation_error');
  });

  it('returns trip detail with optional members and messages and lists shared trips for collaborators', async () => {
    await addCollaborator('editor');

    const listResponse = await appRequest('/api/v1/trips?scope=shared&status=active', {
      headers: collaboratorHeaders(),
    });

    expect(listResponse.status).toBe(200);
    const listPayload = await listResponse.json() as {
      data: Array<{ id: string; accessRole: string }>;
    };
    expect(listPayload.data).toHaveLength(1);
    expect(listPayload.data[0]).toMatchObject({
      id: tripId,
      accessRole: 'editor',
    });

    const detailResponse = await appRequest(
      `/api/v1/trips/${tripId}?include=members&include=messages&messageLimit=5`,
      {
        headers: collaboratorHeaders(),
      },
    );

    expect(detailResponse.status).toBe(200);
    const detailPayload = await detailResponse.json() as {
      data: {
        members?: Array<{ userId: string }>;
        permissions: { role: string; canEdit: boolean; canManageMembers: boolean };
        recentMessages: Array<{ id: string }>;
        summary: { accessRole: string };
      };
    };
    expect(detailPayload.data.summary.accessRole).toBe('editor');
    expect(detailPayload.data.permissions).toMatchObject({
      role: 'editor',
      canEdit: true,
      canManageMembers: false,
    });
    expect(detailPayload.data.members?.map((member) => member.userId).sort()).toEqual(
      [collaboratorId, ownerId].sort(),
    );
    expect(detailPayload.data.recentMessages.map((message) => message.id)).toEqual([messageId]);
  });

  it('rejects invalid list and detail requests', async () => {
    const invalidListQueryResponse = await appRequest('/api/v1/trips?limit=0', {
      headers: ownerHeaders(),
    });
    await expectApiError(invalidListQueryResponse, 422, 'validation_error');

    const invalidListCursorResponse = await appRequest('/api/v1/trips?cursor=not-base64', {
      headers: ownerHeaders(),
    });
    await expectApiError(invalidListCursorResponse, 422, 'validation_error');

    const notFoundResponse = await appRequest('/api/v1/trips/trip_missing', {
      headers: ownerHeaders(),
    });
    await expectApiError(notFoundResponse, 404, 'trip_not_found');

    const forbiddenResponse = await appRequest(`/api/v1/trips/${tripId}`, {
      headers: strangerHeaders(),
    });
    await expectApiError(forbiddenResponse, 403, 'forbidden');
  });

  it('replaces an itinerary and normalizes missing activity ids', async () => {
    await addCollaborator('editor');

    const response = await appRequest(`/api/v1/trips/${tripId}/itinerary`, {
      method: 'PUT',
      headers: collaboratorHeaders(),
      body: JSON.stringify({
        expectedVersion: 2,
        itinerary: {
          destination: 'Tokyo, Japan',
          title: 'Tokyo Market Sprint',
          totalDays: 2,
          totalBudget: 1500,
          currency: 'USD',
          overview: 'Manual update from the editor.',
          days: [
            {
              day: 1,
              theme: 'Markets',
              activities: [
                {
                  time: '09:00',
                  description: 'Walk Tsukiji Outer Market',
                  location: 'Tsukiji',
                },
              ],
            },
          ],
          budgetBreakdown: [{ category: 'Food', amount: 500 }],
        },
      }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      data: {
        currentItinerary: { days: Array<{ activities: Array<{ id?: string }> }> };
        summary: { title: string; version: number };
      };
    };
    expect(payload.data.summary).toMatchObject({
      title: 'Tokyo Market Sprint',
      version: 3,
    });
    expect(payload.data.currentItinerary.days[0]?.activities[0]?.id).toBeTruthy();
  });

  it('rejects itinerary replacement for viewers, stale writes, and invalid payloads', async () => {
    await addCollaborator('viewer');

    const forbiddenResponse = await appRequest(`/api/v1/trips/${tripId}/itinerary`, {
      method: 'PUT',
      headers: collaboratorHeaders(),
      body: JSON.stringify({
        expectedVersion: 2,
        itinerary: {
          destination: 'Tokyo, Japan',
          title: 'Viewer Attempt',
          totalDays: 1,
          totalBudget: 100,
          currency: 'USD',
          overview: 'Should fail.',
          days: [],
          budgetBreakdown: [],
        },
      }),
    });
    await expectApiError(forbiddenResponse, 403, 'forbidden');

    const staleWriteResponse = await appRequest(`/api/v1/trips/${tripId}/itinerary`, {
      method: 'PUT',
      headers: ownerHeaders(),
      body: JSON.stringify({
        expectedVersion: 99,
        itinerary: {
          destination: 'Tokyo, Japan',
          title: 'Owner Attempt',
          totalDays: 1,
          totalBudget: 100,
          currency: 'USD',
          overview: 'Should fail.',
          days: [],
          budgetBreakdown: [],
        },
      }),
    });
    await expectApiError(staleWriteResponse, 409, 'stale_write');

    const validationResponse = await appRequest(`/api/v1/trips/${tripId}/itinerary`, {
      method: 'PUT',
      headers: ownerHeaders(),
      body: JSON.stringify({
        expectedVersion: 2,
        itinerary: {
          destination: 'Tokyo, Japan',
          totalDays: 1,
          totalBudget: 100,
          currency: 'USD',
          overview: 'Missing title should fail.',
          days: [],
          budgetBreakdown: [],
        },
      }),
    });
    await expectApiError(validationResponse, 422, 'validation_error');
  });

  it('refines a trip and appends the new user message', async () => {
    const refineApp = createTestApp({
      itineraryFactory: (_prompt, currentItinerary) => ({
        destination: currentItinerary?.destination ?? 'Tokyo, Japan',
        title: 'Tokyo Refined Escape',
        totalDays: currentItinerary?.totalDays ?? 3,
        totalBudget: currentItinerary?.totalBudget ?? 1200,
        currency: currentItinerary?.currency ?? 'USD',
        overview: 'Refined itinerary with one extra stop.',
        days: currentItinerary?.days ?? [],
        budgetBreakdown: currentItinerary?.budgetBreakdown ?? [],
      }),
    });

    const response = await appRequest(
      `/api/v1/trips/${tripId}/refinements`,
      {
        method: 'POST',
        headers: ownerHeaders(),
        body: JSON.stringify({
          prompt: 'Add a ramen stop on Day 2.',
          expectedVersion: 1,
          clientRequestId: '7009f509-8920-4208-bf6d-8b7e8549ceeb',
        }),
      },
      refineApp,
    );

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      data: {
        currentItinerary: { title: string };
        recentMessages: Array<{ text: string }>;
        summary: { version: number; lastRefinedAt: string | null };
      };
    };
    expect(payload.data.currentItinerary.title).toBe('Tokyo Refined Escape');
    expect(payload.data.summary.version).toBe(2);
    expect(payload.data.summary.lastRefinedAt).toBeTruthy();
    expect(payload.data.recentMessages.map((message) => message.text)).toEqual([
      'Plan a Tokyo trip.',
      'Add a ramen stop on Day 2.',
    ]);
  });

  it('returns refine-trip failures for viewers, stale writes, and provider errors', async () => {
    await addCollaborator('viewer');

    const forbiddenResponse = await appRequest(`/api/v1/trips/${tripId}/refinements`, {
      method: 'POST',
      headers: collaboratorHeaders(),
      body: JSON.stringify({
        prompt: 'Add a ramen stop on Day 2.',
        expectedVersion: 2,
      }),
    });
    await expectApiError(forbiddenResponse, 403, 'forbidden');

    const unrelatedPromptResponse = await appRequest(
      `/api/v1/trips/${tripId}/refinements`,
      {
        method: 'POST',
        headers: ownerHeaders(),
        body: JSON.stringify({
          prompt: 'Explain quantum computing with TypeScript examples.',
          expectedVersion: 2,
        }),
      },
      createProviderFailureApp(422, 'invalid_refinement_prompt', 'The refinement must stay focused on the current trip.'),
    );
    await expectApiError(unrelatedPromptResponse, 422, 'invalid_refinement_prompt');

    const staleWriteResponse = await appRequest(`/api/v1/trips/${tripId}/refinements`, {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({
        prompt: 'Add a ramen stop on Day 2.',
        expectedVersion: 99,
      }),
    });
    await expectApiError(staleWriteResponse, 409, 'stale_write');

    const unavailableResponse = await appRequest(
      `/api/v1/trips/${tripId}/refinements`,
      {
        method: 'POST',
        headers: ownerHeaders(),
        body: JSON.stringify({
          prompt: 'Add a ramen stop on Day 2.',
          expectedVersion: 2,
        }),
      },
      createProviderFailureApp(503, 'provider_unavailable', 'The itinerary service is down.'),
    );
    await expectApiError(unavailableResponse, 503, 'provider_unavailable');

    const invalidResponse = await appRequest(
      `/api/v1/trips/${tripId}/refinements`,
      {
        method: 'POST',
        headers: ownerHeaders(),
        body: JSON.stringify({
          prompt: 'Add a ramen stop on Day 2.',
          expectedVersion: 2,
        }),
      },
      createProviderFailureApp(502, 'provider_invalid_response', 'The itinerary service returned invalid JSON.'),
    );
    await expectApiError(invalidResponse, 502, 'provider_invalid_response');
  });

  it('rejects refinement responses that drift to a different destination', async () => {
    const driftingRefineApp = createTestApp({
      itineraryFactory: () => ({
        destination: 'Paris, France',
        title: 'Paris Reset',
        totalDays: 3,
        totalBudget: 1200,
        currency: 'USD',
        overview: 'A different trip entirely.',
        days: [
          {
            day: 1,
            theme: 'Paris arrival',
            activities: [
              {
                id: 'activity_paris_1',
                time: '10:00',
                description: 'Walk by the Seine',
                location: 'Seine River',
              },
            ],
          },
        ],
        budgetBreakdown: [
          { category: 'Food', amount: 400 },
          { category: 'Stay', amount: 800 },
        ],
      }),
    });

    const response = await appRequest(
      `/api/v1/trips/${tripId}/refinements`,
      {
        method: 'POST',
        headers: ownerHeaders(),
        body: JSON.stringify({
          prompt: 'Add a ramen stop on Day 2.',
          expectedVersion: 1,
        }),
      },
      driftingRefineApp,
    );

    await expectApiError(response, 502, 'provider_invalid_response');
  });

  it('returns refine-trip validation and not-found errors', async () => {
    const validationResponse = await appRequest(`/api/v1/trips/${tripId}/refinements`, {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({
        prompt: '   ',
        expectedVersion: 1,
      }),
    });
    await expectApiError(validationResponse, 422, 'validation_error');

    const missingVersionResponse = await appRequest(`/api/v1/trips/${tripId}/refinements`, {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({
        prompt: 'Add a ramen stop on Day 2.',
      }),
    });
    await expectApiError(missingVersionResponse, 422, 'validation_error');

    const notFoundResponse = await appRequest(`/api/v1/trips/trip_missing/refinements`, {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({
        prompt: 'Add a ramen stop on Day 2.',
        expectedVersion: 1,
      }),
    });
    await expectApiError(notFoundResponse, 404, 'trip_not_found');
  });

  it('patches trip metadata as the owner', async () => {
    const response = await appRequest(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: ownerHeaders(),
      body: JSON.stringify({
        expectedVersion: 1,
        title: 'Tokyo Food Crawl',
        visibility: 'shared',
        archived: true,
      }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      data: { summary: { title: string; visibility: string; version: number; archivedAt: string | null } };
    };
    expect(payload.data.summary).toMatchObject({
      title: 'Tokyo Food Crawl',
      visibility: 'shared',
      version: 2,
    });
    expect(payload.data.summary.archivedAt).toBeTruthy();
  });

  it('rejects invalid trip metadata mutations', async () => {
    await addCollaborator('editor');

    const forbiddenResponse = await appRequest(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: collaboratorHeaders(),
      body: JSON.stringify({
        expectedVersion: 2,
        title: 'Editor Mutation',
      }),
    });
    await expectApiError(forbiddenResponse, 403, 'forbidden');

    const staleWriteResponse = await appRequest(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: ownerHeaders(),
      body: JSON.stringify({
        expectedVersion: 99,
        title: 'Stale Owner Mutation',
      }),
    });
    await expectApiError(staleWriteResponse, 409, 'stale_write');

    const validationResponse = await appRequest(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: ownerHeaders(),
      body: JSON.stringify({
        expectedVersion: 2,
      }),
    });
    await expectApiError(validationResponse, 422, 'validation_error');

    const privateSharedConflictResponse = await appRequest(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: ownerHeaders(),
      body: JSON.stringify({
        expectedVersion: 2,
        visibility: 'private',
      }),
    });
    await expectApiError(privateSharedConflictResponse, 422, 'validation_error');
  });

  it('lists messages with cursor pagination and rejects invalid requests', async () => {
    await addCollaborator('editor');
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

    const firstPageResponse = await appRequest(`/api/v1/trips/${tripId}/messages?limit=2`, {
      headers: collaboratorHeaders(),
    });

    expect(firstPageResponse.status).toBe(200);
    const firstPayload = await firstPageResponse.json() as {
      data: Array<{ id: string }>;
      meta: { nextCursor: string | null };
    };
    expect(firstPayload.data.map((message) => message.id)).toEqual(['msg_test_002', 'msg_test_003']);
    expect(firstPayload.meta.nextCursor).toBeTruthy();

    const secondPageResponse = await appRequest(
      `/api/v1/trips/${tripId}/messages?limit=2&cursor=${encodeURIComponent(firstPayload.meta.nextCursor ?? '')}`,
      {
        headers: collaboratorHeaders(),
      },
    );

    expect(secondPageResponse.status).toBe(200);
    const secondPayload = await secondPageResponse.json() as {
      data: Array<{ id: string }>;
      meta: { nextCursor: string | null };
    };
    expect(secondPayload.data.map((message) => message.id)).toEqual(['msg_test_001']);
    expect(secondPayload.meta.nextCursor).toBeNull();

    const invalidCursorResponse = await appRequest(`/api/v1/trips/${tripId}/messages?cursor=not-base64`, {
      headers: collaboratorHeaders(),
    });
    await expectApiError(invalidCursorResponse, 422, 'validation_error');

    const invalidLimitResponse = await appRequest(`/api/v1/trips/${tripId}/messages?limit=0`, {
      headers: collaboratorHeaders(),
    });
    await expectApiError(invalidLimitResponse, 422, 'validation_error');

    const notFoundResponse = await appRequest(`/api/v1/trips/trip_missing/messages`, {
      headers: ownerHeaders(),
    });
    await expectApiError(notFoundResponse, 404, 'trip_not_found');

    const forbiddenResponse = await appRequest(`/api/v1/trips/${tripId}/messages`, {
      headers: strangerHeaders(),
    });
    await expectApiError(forbiddenResponse, 403, 'forbidden');
  });

  it('manages members through add, update, revoke, re-add, and delete', async () => {
    const addResponse = await appRequest(`/api/v1/trips/${tripId}/members`, {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({
        email: 'collab@example.com',
        role: 'editor',
      }),
    });

    expect(addResponse.status).toBe(201);
    const addPayload = await addResponse.json() as {
      data: { member: { userId: string; role: string }; summary: { memberCount: number; visibility: string } };
    };
    expect(addPayload.data.member).toMatchObject({
      userId: collaboratorId,
      role: 'editor',
    });
    expect(addPayload.data.summary).toMatchObject({
      memberCount: 2,
      visibility: 'shared',
    });

    const updateResponse = await appRequest(`/api/v1/trips/${tripId}/members/${collaboratorId}`, {
      method: 'PATCH',
      headers: ownerHeaders(),
      body: JSON.stringify({
        role: 'viewer',
      }),
    });

    expect(updateResponse.status).toBe(200);
    const updatePayload = await updateResponse.json() as {
      data: { member: { role: string } };
    };
    expect(updatePayload.data.member.role).toBe('viewer');

    const revokeResponse = await appRequest(`/api/v1/trips/${tripId}/members/${collaboratorId}`, {
      method: 'PATCH',
      headers: ownerHeaders(),
      body: JSON.stringify({
        revoked: true,
      }),
    });

    expect(revokeResponse.status).toBe(200);
    const revokePayload = await revokeResponse.json() as {
      data: { member: { status: string }; summary: { memberCount: number } };
    };
    expect(revokePayload.data.member.status).toBe('revoked');
    expect(revokePayload.data.summary.memberCount).toBe(1);

    await addCollaborator('viewer');

    const deleteResponse = await appRequest(`/api/v1/trips/${tripId}/members/${collaboratorId}`, {
      method: 'DELETE',
      headers: ownerHeaders(),
    });

    expect(deleteResponse.status).toBe(204);

    const membersResponse = await appRequest(`/api/v1/trips/${tripId}/members`, {
      headers: ownerHeaders(),
    });
    expect(membersResponse.status).toBe(200);
    const membersPayload = await membersResponse.json() as { data: Array<{ userId: string }> };
    expect(membersPayload.data.map((member) => member.userId)).toEqual([ownerId]);
  });

  it('returns member-management permission and validation errors', async () => {
    await addCollaborator('editor');

    const duplicateResponse = await appRequest(`/api/v1/trips/${tripId}/members`, {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({
        userId: collaboratorId,
        role: 'viewer',
      }),
    });
    await expectApiError(duplicateResponse, 409, 'member_exists');

    const unknownUserResponse = await appRequest(`/api/v1/trips/${tripId}/members`, {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({
        email: 'missing@example.com',
        role: 'viewer',
      }),
    });
    await expectApiError(unknownUserResponse, 404, 'user_not_found');

    const invalidAddResponse = await appRequest(`/api/v1/trips/${tripId}/members`, {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({
        role: 'viewer',
      }),
    });
    await expectApiError(invalidAddResponse, 422, 'validation_error');

    const forbiddenListResponse = await appRequest(`/api/v1/trips/${tripId}/members`, {
      headers: collaboratorHeaders(),
    });
    await expectApiError(forbiddenListResponse, 403, 'forbidden');

    const forbiddenAddResponse = await appRequest(`/api/v1/trips/${tripId}/members`, {
      method: 'POST',
      headers: collaboratorHeaders(),
      body: JSON.stringify({
        userId: strangerId,
        role: 'viewer',
      }),
    });
    await expectApiError(forbiddenAddResponse, 403, 'forbidden');

    const invalidUpdateResponse = await appRequest(`/api/v1/trips/${tripId}/members/${collaboratorId}`, {
      method: 'PATCH',
      headers: ownerHeaders(),
      body: JSON.stringify({}),
    });
    await expectApiError(invalidUpdateResponse, 422, 'validation_error');

    const forbiddenUpdateResponse = await appRequest(`/api/v1/trips/${tripId}/members/${collaboratorId}`, {
      method: 'PATCH',
      headers: collaboratorHeaders(),
      body: JSON.stringify({
        role: 'viewer',
      }),
    });
    await expectApiError(forbiddenUpdateResponse, 403, 'forbidden');

    const forbiddenDeleteResponse = await appRequest(`/api/v1/trips/${tripId}/members/${collaboratorId}`, {
      method: 'DELETE',
      headers: collaboratorHeaders(),
    });
    await expectApiError(forbiddenDeleteResponse, 403, 'forbidden');
  });

  it('returns member-management not-found errors for trips and members', async () => {
    const missingTripListResponse = await appRequest(`/api/v1/trips/trip_missing/members`, {
      headers: ownerHeaders(),
    });
    await expectApiError(missingTripListResponse, 404, 'trip_not_found');

    const missingTripAddResponse = await appRequest(`/api/v1/trips/trip_missing/members`, {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({
        userId: collaboratorId,
        role: 'viewer',
      }),
    });
    await expectApiError(missingTripAddResponse, 404, 'trip_not_found');

    const missingMemberUpdateResponse = await appRequest(`/api/v1/trips/${tripId}/members/user_missing`, {
      method: 'PATCH',
      headers: ownerHeaders(),
      body: JSON.stringify({
        role: 'viewer',
      }),
    });
    await expectApiError(missingMemberUpdateResponse, 404, 'member_not_found');

    const ownerUpdateResponse = await appRequest(`/api/v1/trips/${tripId}/members/${ownerId}`, {
      method: 'PATCH',
      headers: ownerHeaders(),
      body: JSON.stringify({
        role: 'viewer',
      }),
    });
    await expectApiError(ownerUpdateResponse, 404, 'member_not_found');

    const missingTripDeleteResponse = await appRequest(`/api/v1/trips/trip_missing/members/${collaboratorId}`, {
      method: 'DELETE',
      headers: ownerHeaders(),
    });
    await expectApiError(missingTripDeleteResponse, 404, 'trip_not_found');

    const ownerDeleteResponse = await appRequest(`/api/v1/trips/${tripId}/members/${ownerId}`, {
      method: 'DELETE',
      headers: ownerHeaders(),
    });
    await expectApiError(ownerDeleteResponse, 404, 'member_not_found');
  });

  it('deletes the trip and blocks non-owners from deleting it', async () => {
    await addCollaborator('editor');

    const forbiddenResponse = await appRequest(`/api/v1/trips/${tripId}`, {
      method: 'DELETE',
      headers: collaboratorHeaders(),
    });
    await expectApiError(forbiddenResponse, 403, 'forbidden');

    const deleteResponse = await appRequest(`/api/v1/trips/${tripId}`, {
      method: 'DELETE',
      headers: ownerHeaders(),
    });

    expect(deleteResponse.status).toBe(204);
    await expect(tripsRepository.getTripSummary(tripId)).resolves.toBeNull();
    await expect(tripsRepository.getTripMember(tripId, ownerId)).resolves.toBeNull();
    await expect(tripsRepository.getTripMember(tripId, collaboratorId)).resolves.toBeNull();
  });

  it('returns not found when deleting a missing trip', async () => {
    const response = await appRequest(`/api/v1/trips/trip_missing`, {
      method: 'DELETE',
      headers: ownerHeaders(),
    });

    await expectApiError(response, 404, 'trip_not_found');
  });
});
