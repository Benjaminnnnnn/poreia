import { Hono, type Context } from 'hono';
import { getAppEnv, type EnvBindings } from '../core/env';
import { jsonData } from '../core/http';
import { getLogger } from '../core/logger';
import { FirestoreClient } from '../firestore/client';
import { TripsRepository } from '../firestore/tripsRepository';
import { checkShareRateLimit } from '../http/tripRateLimit';
import { ItineraryProvider } from '../itinerary/provider';
import { TripsService } from '../services/tripsService';

type ShareRouteContext = Context<{ Bindings: EnvBindings }>;
type TripsServiceBuilder = (context: ShareRouteContext) => TripsService;

export interface CreateShareRoutesOptions {
  buildTripsService?: TripsServiceBuilder;
}

function createServerFirestoreClient(appEnv: ReturnType<typeof getAppEnv>) {
  return new FirestoreClient(
    appEnv,
    appEnv.firestoreEmulatorHost ? { emulatorAuth: 'owner' } : undefined,
  );
}

function defaultBuildTripsService(context: ShareRouteContext): TripsService {
  const appEnv = getAppEnv(context.env);
  return new TripsService(
    new TripsRepository(createServerFirestoreClient(appEnv)),
    new ItineraryProvider(appEnv.pollinationsApiKey, getLogger(context)),
  );
}

export function createShareRoutes(options: CreateShareRoutesOptions = {}) {
  const app = new Hono<{ Bindings: EnvBindings }>();
  const buildTripsService = options.buildTripsService ?? defaultBuildTripsService;

  app.get('/share/:tripId', async (context) => {
    if (context.env.POREIA_RATE_LIMIT_KV) {
      const ip =
        context.req.header('CF-Connecting-IP') ??
        context.req.header('X-Forwarded-For') ??
        'unknown';
      const limit = await checkShareRateLimit(context.env.POREIA_RATE_LIMIT_KV, ip);
      if (!limit.allowed) {
        return context.json(
          { error: { code: 'rate_limit_exceeded', message: 'Too many requests. Try again shortly.' } },
          429,
        );
      }
    }

    const tripsService = buildTripsService(context);
    const result = await tripsService.getPublicTripDetail(context.req.param('tripId'));
    return jsonData(context, result);
  });

  return app;
}
