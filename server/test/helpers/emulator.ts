import type { MiddlewareHandler } from 'hono';
import { createApp } from '../../src/app';
import { getAppEnv, type EnvBindings } from '../../src/core/env';
import { AppError } from '../../src/core/errors';
import { FirestoreClient } from '../../src/firestore/client';
import { TripsRepository } from '../../src/firestore/tripsRepository';
import { ItineraryProvider } from '../../src/itinerary/provider';
import { TripMembersService } from '../../src/services/tripMembersService';
import { TripsService } from '../../src/services/tripsService';
import type {
  AuthUser,
  MessageDoc,
  SnapshotDoc,
  TravelItinerary,
  TripMemberDoc,
  TripMembershipMirrorDoc,
  TripSummaryDoc,
  UserProfileDoc,
} from '../../src/types/domain';

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'poreia-c566a';
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

if (!firestoreEmulatorHost) {
  throw new Error('FIRESTORE_EMULATOR_HOST is required for integration tests.');
}

export const testEnv: EnvBindings = {
  FIREBASE_PROJECT_ID: projectId,
  FIRESTORE_EMULATOR_HOST: firestoreEmulatorHost,
};

const appEnv = getAppEnv(testEnv);

function parseTestUser(testUserHeader: string | undefined | null): AuthUser {
  if (!testUserHeader) {
    throw new AppError(401, 'unauthorized', 'Missing authorization token.');
  }

  let parsed: Partial<AuthUser>;
  try {
    parsed = JSON.parse(testUserHeader) as Partial<AuthUser>;
  } catch {
    throw new AppError(401, 'unauthorized', 'Invalid authorization token.');
  }

  if (typeof parsed.uid !== 'string' || parsed.uid.trim().length === 0) {
    throw new AppError(401, 'unauthorized', 'Invalid authorization token.');
  }

  return {
    uid: parsed.uid,
    email: typeof parsed.email === 'string' ? parsed.email : null,
    displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
    photoURL: typeof parsed.photoURL === 'string' ? parsed.photoURL : null,
  };
}

class StubItineraryProvider extends ItineraryProvider {
  constructor(private readonly implementation: TripsService['createTrip'] extends never ? never : (
    prompt: string,
    currentItinerary?: TravelItinerary | null,
  ) => TravelItinerary | Promise<TravelItinerary>) {
    super(undefined);
  }

  override async generateOrRefine(
    prompt: string,
    _history = [],
    currentItinerary?: TravelItinerary | null,
  ): Promise<TravelItinerary> {
    return this.implementation(prompt, currentItinerary);
  }
}

function createAdminFirestoreClient() {
  return new FirestoreClient(appEnv, { emulatorAuth: 'owner' });
}

function createTripsService(
  itineraryFactory: (prompt: string, currentItinerary?: TravelItinerary | null) => TravelItinerary | Promise<TravelItinerary>,
) {
  return new TripsService(
    new TripsRepository(createAdminFirestoreClient()),
    new StubItineraryProvider(itineraryFactory),
  );
}

function createTripMembersService() {
  return new TripMembersService(new TripsRepository(createAdminFirestoreClient()));
}

const testAuthMiddleware: MiddlewareHandler<{ Bindings: EnvBindings }> = async (context, next) => {
  context.set('appEnv', getAppEnv(context.env));
  context.set('authUser', parseTestUser(context.req.header('x-test-user')));
  await next();
};

function defaultItinerary(prompt: string, currentItinerary?: TravelItinerary | null): TravelItinerary {
  if (currentItinerary) {
    return {
      ...currentItinerary,
      overview: `${currentItinerary.overview} Refined.`,
    };
  }

  return {
    destination: 'Tokyo, Japan',
    title: 'Tokyo Food Crawl',
    totalDays: 3,
    totalBudget: 1800,
    currency: 'USD',
    overview: `Generated from: ${prompt}`,
    days: [
      {
        day: 1,
        theme: 'Arrival',
        activities: [
          {
            id: 'activity_generated_1',
            time: '10:00',
            description: 'Arrive in Tokyo',
            location: 'Tokyo Station',
          },
        ],
      },
    ],
    budgetBreakdown: [
      {
        category: 'Food',
        amount: 600,
      },
      {
        category: 'Stay',
        amount: 1200,
      },
    ],
  };
}

interface CreateTestAppOptions {
  authMiddleware?: MiddlewareHandler<{ Bindings: EnvBindings }>;
  buildTripMembersService?: () => TripMembersService;
  buildTripsService?: () => TripsService;
  itineraryFactory?: (
    prompt: string,
    currentItinerary?: TravelItinerary | null,
  ) => TravelItinerary | Promise<TravelItinerary>;
}

export function createTestApp(options: CreateTestAppOptions = {}) {
  const tripsServiceFactory = options.buildTripsService
    ?? (() => createTripsService(options.itineraryFactory ?? defaultItinerary));
  return createApp({
    shareRoutes: {
      buildTripsService: () => tripsServiceFactory(),
    },
    tripsRoutes: {
      authMiddleware: options.authMiddleware ?? testAuthMiddleware,
      buildTripMembersService: options.buildTripMembersService ?? (() => createTripMembersService()),
      buildTripsService: tripsServiceFactory,
    },
  });
}

export const app = createTestApp();

export const firestoreClient = createAdminFirestoreClient();
export const tripsRepository = new TripsRepository(firestoreClient);

export async function resetEmulator(): Promise<void> {
  const response = await fetch(
    `http://${firestoreEmulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: 'DELETE' },
  );

  if (!response.ok) {
    throw new Error(`Failed to reset Firestore emulator: ${response.status} ${await response.text()}`);
  }
}

export function testUserHeader(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-test-user': JSON.stringify({
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
    }),
  };
}

export async function appRequest(
  path: string,
  init: RequestInit = {},
  targetApp: ReturnType<typeof createTestApp> = app,
): Promise<Response> {
  return targetApp.request(`http://localhost${path}`, init, testEnv);
}

export async function upsertUser(userId: string, user: UserProfileDoc): Promise<void> {
  await firestoreClient.commit([
    firestoreClient.buildUpdateWrite(`users/${userId}`, user as unknown as Record<string, unknown>),
  ]);
}

export async function createSeedTrip(input: {
  initialMessage: MessageDoc;
  member: TripMemberDoc;
  mirror: TripMembershipMirrorDoc;
  ownerUser: UserProfileDoc;
  snapshot: SnapshotDoc;
  summary: TripSummaryDoc;
  tripId: string;
  messageId: string;
}): Promise<void> {
  await tripsRepository.createTripBundle({
    initialMessage: input.initialMessage,
    member: input.member,
    mirror: input.mirror,
    user: input.ownerUser,
    snapshot: input.snapshot,
    summary: input.summary,
    tripId: input.tripId,
    messageId: input.messageId,
  });
}

export async function upsertTripMessages(
  tripId: string,
  messages: Array<{ message: MessageDoc; messageId: string }>,
): Promise<void> {
  await firestoreClient.commit(
    messages.map(({ messageId, message }) =>
      firestoreClient.buildUpdateWrite(
        `trips/${tripId}/messages/${messageId}`,
        message as unknown as Record<string, unknown>,
      ),
    ),
  );
}
