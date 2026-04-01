import type { AuthUser } from './domain';
import type { AppEnv } from '../core/env';

declare module 'hono' {
  interface ContextVariableMap {
    appEnv: AppEnv;
    authUser: AuthUser;
    requestId: string;
  }
}
