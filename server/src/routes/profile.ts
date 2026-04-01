import { Hono, type MiddlewareHandler } from 'hono';
import { getAppEnv, type EnvBindings } from '../core/env';
import { jsonData } from '../core/http';
import { FirestoreClient } from '../firestore/client';
import { TripsRepository } from '../firestore/tripsRepository';
import { requireAuth } from '../http/auth';
import { UserProfilesService } from '../services/userProfilesService';

type UserProfilesServiceBuilder = (env: EnvBindings) => UserProfilesService;

function createServerFirestoreClient(appEnv: ReturnType<typeof getAppEnv>) {
  return new FirestoreClient(
    appEnv,
    appEnv.firestoreEmulatorHost ? { emulatorAuth: 'owner' } : undefined,
  );
}

function defaultBuildUserProfilesService(env: EnvBindings): UserProfilesService {
  const appEnv = getAppEnv(env);
  return new UserProfilesService(
    new TripsRepository(createServerFirestoreClient(appEnv)),
  );
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

  app.use('*', authMiddleware);

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
