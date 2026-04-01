import type { Context } from 'hono';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;
export interface LoggerOptions {
  largeTextFields?: Record<string, number>;
}

type LoggerSinkMethod = 'debug' | 'info' | 'warn' | 'error' | 'log';

interface LoggerSink {
  debug?: (message?: unknown, ...optionalParams: unknown[]) => void;
  error?: (message?: unknown, ...optionalParams: unknown[]) => void;
  info?: (message?: unknown, ...optionalParams: unknown[]) => void;
  log: (message?: unknown, ...optionalParams: unknown[]) => void;
  warn?: (message?: unknown, ...optionalParams: unknown[]) => void;
}

export interface Logger {
  child(context: LogContext, options?: LoggerOptions): Logger;
  debug(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  log(level: LogLevel, message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
}

interface LogEntry extends LogContext {
  level: LogLevel;
  message: string;
  timestamp: string;
}

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}...`;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    const ownProperties = Object.fromEntries(
      Object.entries(Object.getOwnPropertyDescriptors(value))
        .filter(([key, descriptor]) => key !== 'cause' && key !== 'message' && key !== 'name' && key !== 'stack' && 'value' in descriptor)
        .map(([key, descriptor]) => [key, serializeValue(descriptor.value)]),
    );

    return {
      cause: value.cause instanceof Error ? serializeValue(value.cause) : value.cause,
      message: value.message,
      name: value.name,
      ...ownProperties,
      stack: value.stack,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item));
  }

  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeValue(nestedValue)]),
    );
  }

  return value;
}

function mergeOptions(baseOptions: LoggerOptions, nextOptions?: LoggerOptions): LoggerOptions {
  return {
    largeTextFields: {
      ...(baseOptions.largeTextFields ?? {}),
      ...(nextOptions?.largeTextFields ?? {}),
    },
  };
}

function normalizeContext(context: LogContext, options: LoggerOptions): LogContext {
  const entries: Array<[string, unknown]> = [];

  for (const [key, value] of Object.entries(context)) {
    const serializedValue = serializeValue(value);
    const maxChars = options.largeTextFields?.[key];

    if (typeof serializedValue === 'string' && typeof maxChars === 'number') {
      entries.push([key, truncateText(serializedValue, maxChars)]);
      entries.push([`${key}Length`, serializedValue.length]);
      entries.push([`${key}Truncated`, serializedValue.length > maxChars]);
      continue;
    }

    entries.push([key, serializedValue]);
  }

  return Object.fromEntries(entries);
}

function emitLog(sink: LoggerSink, level: LogLevel, entry: LogEntry): void {
  const method: LoggerSinkMethod = level;
  const writer = sink[method] ?? sink.log;
  writer.call(sink, JSON.stringify(entry));
}

export function createLogger(
  baseContext: LogContext = {},
  sink: LoggerSink = console,
  options: LoggerOptions = {},
): Logger {
  const normalizedBaseContext = normalizeContext(baseContext, options);

  const log = (level: LogLevel, message: string, context: LogContext = {}) => {
    emitLog(sink, level, {
      ...normalizedBaseContext,
      ...normalizeContext(context, options),
      level,
      message,
      timestamp: new Date().toISOString(),
    });
  };

  return {
    child(context: LogContext, childOptions?: LoggerOptions) {
      const nextOptions = mergeOptions(options, childOptions);
      return createLogger(
        { ...normalizedBaseContext, ...normalizeContext(context, nextOptions) },
        sink,
        nextOptions,
      );
    },
    debug(message: string, context?: LogContext) {
      log('debug', message, context);
    },
    error(message: string, context?: LogContext) {
      log('error', message, context);
    },
    info(message: string, context?: LogContext) {
      log('info', message, context);
    },
    log,
    warn(message: string, context?: LogContext) {
      log('warn', message, context);
    },
  };
}

export const appLogger = createLogger({
  app: 'poreia-server',
});

export function createRequestLogger(request: Request, requestId: string, parent: Logger = appLogger) {
  const url = new URL(request.url);

  return parent.child({
    method: request.method,
    path: url.pathname,
    requestId,
  });
}

export function getLogger(context: Context): Logger {
  return context.get('logger');
}
