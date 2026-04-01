import { Hono } from 'hono';
import type { EnvBindings } from './core/env';
import { jsonError, toAppError } from './core/http';
import { createTripsRoutes } from './routes/trips';

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

app.route('/api/v1', createTripsRoutes());

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

export default app;
