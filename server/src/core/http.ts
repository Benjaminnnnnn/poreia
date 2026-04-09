import type { Context } from 'hono';
import { AppError, isAppError } from './errors';

export function jsonData<T>(
  context: Context,
  data: T,
  status = 200,
  meta?: Record<string, unknown>,
  headers?: HeadersInit,
) {
  return new Response(JSON.stringify(meta ? { data, meta } : { data }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': context.get('requestId'),
      ...headers,
    },
  });
}

export function emptyResponse(context: Context, status = 204, headers?: HeadersInit) {
  return new Response(null, {
    status,
    headers: {
      'x-request-id': context.get('requestId'),
      ...headers,
    },
  });
}

export function jsonError(context: Context, error: AppError) {
  return new Response(
    JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? [],
      },
    }),
    {
      status: error.status,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': context.get('requestId'),
      },
    },
  );
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(500, 'internal_error', error.message);
  }

  return new AppError(500, 'internal_error', 'Unexpected internal error.');
}
