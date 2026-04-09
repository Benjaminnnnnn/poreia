import { z } from 'zod';
import { AppError } from './errors';

const envSchema = z
  .object({
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
    FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
    FIRESTORE_EMULATOR_HOST: z.string().min(1).optional(),
    POLLINATIONS_API_KEY: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (!value.FIRESTORE_EMULATOR_HOST) {
      if (!value.FIREBASE_CLIENT_EMAIL) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'FIREBASE_CLIENT_EMAIL is required when not using the Firestore emulator.',
          path: ['FIREBASE_CLIENT_EMAIL'],
        });
      }

      if (!value.FIREBASE_PRIVATE_KEY) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'FIREBASE_PRIVATE_KEY is required when not using the Firestore emulator.',
          path: ['FIREBASE_PRIVATE_KEY'],
        });
      }
    }
  });

export type EnvBindings = {
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  FIRESTORE_EMULATOR_HOST?: string;
  POLLINATIONS_API_KEY?: string;
};

export interface AppEnv {
  firebaseProjectId: string;
  firebaseClientEmail?: string;
  firebasePrivateKey?: string;
  firestoreEmulatorHost?: string;
  pollinationsApiKey?: string;
}

function normalizePrivateKey(privateKey?: string): string | undefined {
  if (!privateKey) {
    return undefined;
  }

  return privateKey.replace(/\\n/g, '\n');
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
    firebaseProjectId: parsed.data.FIREBASE_PROJECT_ID,
    firebaseClientEmail: parsed.data.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: normalizePrivateKey(parsed.data.FIREBASE_PRIVATE_KEY),
    firestoreEmulatorHost: parsed.data.FIRESTORE_EMULATOR_HOST,
    pollinationsApiKey: parsed.data.POLLINATIONS_API_KEY,
  };
  cachedEnvKey = cacheKey;

  return cachedEnv;
}
