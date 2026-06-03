import { z } from 'zod';
import { AppError } from './errors';

const envSchema = z.object({
  SUPABASE_JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  POLLINATIONS_API_KEY: z.string().min(1).optional(),
});

export type EnvBindings = {
  SUPABASE_JWT_SECRET?: string;
  DATABASE_URL?: string;
  POLLINATIONS_API_KEY?: string;
  POREIA_RATE_LIMIT_KV?: KVNamespace;
};

export interface AppEnv {
  supabaseJwtSecret: string;
  databaseUrl: string;
  pollinationsApiKey?: string;
  // Unused after Firebase→Supabase migration; kept so legacy Firestore files compile.
  firebaseProjectId?: undefined;
  firebaseClientEmail?: undefined;
  firebasePrivateKey?: undefined;
  firestoreEmulatorHost?: undefined;
}

let cachedEnvKey: string | null = null;
let cachedEnv: AppEnv | null = null;

export function getAppEnv(bindings: EnvBindings): AppEnv {
  const cacheKey = JSON.stringify(bindings);
  if (cachedEnv && cachedEnvKey === cacheKey) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(bindings);
  if (!parsed.success) {
    throw new AppError(500, 'internal_error', 'Server environment is invalid.', parsed.error.flatten());
  }

  cachedEnv = {
    supabaseJwtSecret: parsed.data.SUPABASE_JWT_SECRET,
    databaseUrl: parsed.data.DATABASE_URL,
    pollinationsApiKey: parsed.data.POLLINATIONS_API_KEY,
  };
  cachedEnvKey = cacheKey;

  return cachedEnv;
}
