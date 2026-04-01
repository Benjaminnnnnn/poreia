import type { MiddlewareHandler } from 'hono';
import { verifyFirebaseIdToken } from '../auth/firebaseIdToken';
import { getAppEnv, type EnvBindings } from '../core/env';
import { AppError } from '../core/errors';

function readBearerToken(authorizationHeader: string | undefined | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export const requireAuth: MiddlewareHandler<{
  Bindings: EnvBindings;
}> = async (context, next) => {
  const appEnv = getAppEnv(context.env);
  context.set('appEnv', appEnv);

  const token = readBearerToken(context.req.header('Authorization'));
  if (!token) {
    throw new AppError(401, 'unauthorized', 'Missing authorization token.');
  }

  const authUser = await verifyFirebaseIdToken(token, appEnv.firebaseProjectId);
  context.set('authUser', authUser);

  await next();
};
