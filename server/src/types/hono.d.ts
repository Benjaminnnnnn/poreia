import type { AuthUser } from './domain';
import type { AppEnv } from '../core/env';
import type { Logger } from '../core/logger';

declare module 'hono' {
  interface ContextVariableMap {
    appEnv: AppEnv;
    authUser: AuthUser;
    logger: Logger;
    requestId: string;
  }
}
