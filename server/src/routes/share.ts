import { Hono, type Context } from 'hono';
import { getAppEnv, type EnvBindings } from '../core/env';
import { jsonData } from '../core/http';
import { getLogger } from '../core/logger';
import { createDrizzleClient } from '../infrastructure/persistence/drizzle/client';
import { DrizzleTripsRepository } from '../infrastructure/persistence/drizzle/DrizzleTripsRepository';
import type { TripsRepository } from '../firestore/tripsRepository';
import { checkShareRateLimit } from '../http/tripRateLimit';
import { ItineraryProvider } from '../itinerary/provider';
import { TripsService } from '../services/tripsService';

type ShareRouteContext = Context<{ Bindings: EnvBindings }>;
type TripsServiceBuilder = (context: ShareRouteContext) => TripsService;

export interface CreateShareRoutesOptions {
  buildTripsService?: TripsServiceBuilder;
}

function defaultBuildTripsService(context: ShareRouteContext): TripsService {
  const appEnv = getAppEnv(context.env);
  const repo = new DrizzleTripsRepository(createDrizzleClient(appEnv.databaseUrl)) as unknown as TripsRepository;
  return new TripsService(
    repo,
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
