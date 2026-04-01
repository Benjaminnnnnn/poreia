import { Hono } from 'hono';
import type { EnvBindings } from './core/env';
import { jsonError, toAppError } from './core/http';
import { createProfileRoutes } from './routes/profile';
import { createTripsRoutes, type CreateTripsRoutesOptions } from './routes/trips';

export interface CreateAppOptions {
  tripsRoutes?: CreateTripsRoutesOptions;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono<{ Bindings: EnvBindings }>();

  app.use('*', async (context, next) => {
    const requestId = crypto.randomUUID();
    context.set('requestId', requestId);
    context.header('x-request-id', requestId);
    await next();
  });

  app.get('/health', (context) =>
    context.json({
      data: {
        ok: true,
      },
    }),
  );

  app.route('/api/v1', createProfileRoutes());
  app.route('/api/v1', createTripsRoutes(options.tripsRoutes));

  app.notFound((context) =>
    context.json(
      {
        error: {
          code: 'not_found',
          message: 'Route not found.',
          details: [],
        },
      },
      404,
    ),
  );

  app.onError((error, context) => jsonError(context, toAppError(error)));

  return app;
}
