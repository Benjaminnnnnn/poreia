import { Hono, type MiddlewareHandler } from 'hono';
import { getAppEnv, type EnvBindings } from '../core/env';
import { jsonData } from '../core/http';
import { createDrizzleClient } from '../infrastructure/persistence/drizzle/client';
import { DrizzleTripsRepository } from '../infrastructure/persistence/drizzle/DrizzleTripsRepository';
import type { TripsRepository } from '../firestore/tripsRepository';
import { requireAuth } from '../http/auth';
import { UserProfilesService } from '../services/userProfilesService';

type UserProfilesServiceBuilder = (env: EnvBindings) => UserProfilesService;

function defaultBuildUserProfilesService(env: EnvBindings): UserProfilesService {
  const appEnv = getAppEnv(env);
  // Cast required because services hold a concrete TripsRepository type;
  // DrizzleTripsRepository is structurally compatible and replaces it.
  const repo = new DrizzleTripsRepository(createDrizzleClient(appEnv.databaseUrl)) as unknown as TripsRepository;
  return new UserProfilesService(repo);
}

export interface CreateProfileRoutesOptions {
  authMiddleware?: MiddlewareHandler<{ Bindings: EnvBindings }>;
  buildUserProfilesService?: UserProfilesServiceBuilder;
}

export function createProfileRoutes(options: CreateProfileRoutesOptions = {}) {
  const app = new Hono<{ Bindings: EnvBindings }>();
  const authMiddleware = options.authMiddleware ?? requireAuth;
  const buildUserProfilesService =
    options.buildUserProfilesService ?? defaultBuildUserProfilesService;

  app.use('/me/*', authMiddleware);

  app.get('/me/profile', async (context) => {
    const profilesService = buildUserProfilesService(context.env);
    const result = await profilesService.getCurrentProfile(
      context.get('authUser'),
    );

    return jsonData(context, result);
  });

  app.patch('/me/profile', async (context) => {
    const profilesService = buildUserProfilesService(context.env);
    const input = profilesService.parseUpdateProfileInput(
      await context.req.json(),
    );
    const result = await profilesService.updateCurrentProfile(
      context.get('authUser'),
      input,
    );

    return jsonData(context, result);
  });

  return app;
}
