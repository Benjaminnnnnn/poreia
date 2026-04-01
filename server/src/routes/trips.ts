import { Hono } from 'hono';
import { getAppEnv, type EnvBindings } from '../core/env';
import { jsonData } from '../core/http';
import { FirestoreClient } from '../firestore/client';
import { TripsRepository } from '../firestore/tripsRepository';
import { requireAuth } from '../http/auth';
import { ItineraryProvider } from '../itinerary/provider';
import { TripsService } from '../services/tripsService';

function buildTripsService(env: EnvBindings): TripsService {
  const appEnv = getAppEnv(env);
  return new TripsService(
    new TripsRepository(new FirestoreClient(appEnv)),
    new ItineraryProvider(appEnv.pollinationsApiKey),
  );
}

export function createTripsRoutes() {
  const app = new Hono<{ Bindings: EnvBindings }>();

  app.use('*', requireAuth);

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
    return context.json(result, 200);
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

  return app;
}
