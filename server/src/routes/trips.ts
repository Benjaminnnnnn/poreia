import { Hono, type MiddlewareHandler } from 'hono';
import { getAppEnv, type EnvBindings } from '../core/env';
import { emptyResponse, jsonData } from '../core/http';
import { FirestoreClient } from '../firestore/client';
import { TripsRepository } from '../firestore/tripsRepository';
import { requireAuth } from '../http/auth';
import { ItineraryProvider } from '../itinerary/provider';
import { TripMembersService } from '../services/tripMembersService';
import { TripsService } from '../services/tripsService';

type TripsServiceBuilder = (env: EnvBindings) => TripsService;
type TripMembersServiceBuilder = (env: EnvBindings) => TripMembersService;

function createServerFirestoreClient(appEnv: ReturnType<typeof getAppEnv>) {
  return new FirestoreClient(
    appEnv,
    appEnv.firestoreEmulatorHost ? { emulatorAuth: 'owner' } : undefined,
  );
}

function defaultBuildTripsService(env: EnvBindings): TripsService {
  const appEnv = getAppEnv(env);
  return new TripsService(
    new TripsRepository(createServerFirestoreClient(appEnv)),
    new ItineraryProvider(appEnv.pollinationsApiKey),
  );
}

function defaultBuildTripMembersService(env: EnvBindings): TripMembersService {
  const appEnv = getAppEnv(env);
  return new TripMembersService(new TripsRepository(createServerFirestoreClient(appEnv)));
}

export interface CreateTripsRoutesOptions {
  authMiddleware?: MiddlewareHandler<{ Bindings: EnvBindings }>;
  buildTripMembersService?: TripMembersServiceBuilder;
  buildTripsService?: TripsServiceBuilder;
}

export function createTripsRoutes(options: CreateTripsRoutesOptions = {}) {
  const app = new Hono<{ Bindings: EnvBindings }>();
  const authMiddleware = options.authMiddleware ?? requireAuth;
  const buildTripMembersService = options.buildTripMembersService ?? defaultBuildTripMembersService;
  const buildTripsService = options.buildTripsService ?? defaultBuildTripsService;

  app.use('*', authMiddleware);

  app.post('/trips', async (context) => {
    const tripsService = buildTripsService(context.env);
    const input = tripsService.parseCreateTripInput(await context.req.json());
    const authUser = context.get('authUser');
    const result = await tripsService.createTrip(authUser, input);

    return jsonData(context, result, 201);
  });

  app.get('/trips', async (context) => {
    const tripsService = buildTripsService(context.env);
    const url = new URL(context.req.url);
    const query = tripsService.parseListTripsQuery({
      cursor: url.searchParams.get('cursor') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      scope: url.searchParams.get('scope') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
    });

    const result = await tripsService.listTrips(context.get('authUser').uid, query);
    return jsonData(context, result.data, 200, result.meta);
  });

  app.get('/trips/:tripId', async (context) => {
    const tripsService = buildTripsService(context.env);
    const url = new URL(context.req.url);
    const includes = new Set(url.searchParams.getAll('include'));
    const parsedQuery = tripsService.parseDetailQuery({
      messageLimit: url.searchParams.get('messageLimit') ?? undefined,
    });

    const result = await tripsService.getTripDetail(context.get('authUser').uid, context.req.param('tripId'), {
      includeMembers: includes.has('members'),
      includeMessages: includes.has('messages'),
      messageLimit: parsedQuery.messageLimit,
    });

    return jsonData(context, result);
  });

  app.put('/trips/:tripId/itinerary', async (context) => {
    const tripsService = buildTripsService(context.env);
    const input = tripsService.parseReplaceItineraryInput(await context.req.json());
    const result = await tripsService.replaceTripItinerary(
      context.get('authUser').uid,
      context.req.param('tripId'),
      input,
    );

    return jsonData(context, result);
  });

  app.post('/trips/:tripId/refinements', async (context) => {
    const tripsService = buildTripsService(context.env);
    const input = tripsService.parseRefineTripInput(await context.req.json());
    const result = await tripsService.refineTrip(
      context.get('authUser').uid,
      context.req.param('tripId'),
      input,
    );

    return jsonData(context, result);
  });

  app.patch('/trips/:tripId', async (context) => {
    const tripsService = buildTripsService(context.env);
    const input = tripsService.parsePatchTripInput(await context.req.json());
    const result = await tripsService.patchTrip(
      context.get('authUser').uid,
      context.req.param('tripId'),
      input,
    );

    return jsonData(context, result);
  });

  app.get('/trips/:tripId/messages', async (context) => {
    const tripsService = buildTripsService(context.env);
    const url = new URL(context.req.url);
    const query = tripsService.parseListMessagesQuery({
      cursor: url.searchParams.get('cursor') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    const result = await tripsService.listTripMessages(
      context.get('authUser').uid,
      context.req.param('tripId'),
      query,
    );

    return jsonData(context, result.data, 200, result.meta);
  });

  app.get('/trips/:tripId/members', async (context) => {
    const membersService = buildTripMembersService(context.env);
    const result = await membersService.listMembers(
      context.get('authUser').uid,
      context.req.param('tripId'),
    );

    return jsonData(context, result);
  });

  app.post('/trips/:tripId/members', async (context) => {
    const membersService = buildTripMembersService(context.env);
    const input = membersService.parseAddMemberInput(await context.req.json());
    const result = await membersService.addMember(
      context.get('authUser').uid,
      context.req.param('tripId'),
      input,
    );

    return jsonData(
      context,
      result,
      201,
      undefined,
      { Location: `/api/v1/trips/${context.req.param('tripId')}/members/${result.member.userId}` },
    );
  });

  app.patch('/trips/:tripId/members/:userId', async (context) => {
    const membersService = buildTripMembersService(context.env);
    const input = membersService.parseUpdateMemberInput(await context.req.json());
    const result = await membersService.updateMember(
      context.get('authUser').uid,
      context.req.param('tripId'),
      context.req.param('userId'),
      input,
    );

    return jsonData(context, result);
  });

  app.delete('/trips/:tripId/members/:userId', async (context) => {
    const membersService = buildTripMembersService(context.env);
    await membersService.removeMember(
      context.get('authUser').uid,
      context.req.param('tripId'),
      context.req.param('userId'),
    );

    return emptyResponse(context);
  });

  app.delete('/trips/:tripId', async (context) => {
    const tripsService = buildTripsService(context.env);
    await tripsService.deleteTrip(
      context.get('authUser').uid,
      context.req.param('tripId'),
    );

    return emptyResponse(context);
  });

  return app;
}
