// @ts-nocheck — dead code, kept for rollback reference only
import { importPKCS8, SignJWT } from 'jose';
import type { AppEnv } from '../core/env';
import { AppError } from '../core/errors';

interface CachedAccessToken {
  accessToken: string;
  expiresAt: number;
}

let cachedAccessToken: CachedAccessToken | null = null;

async function mintAccessToken(env: AppEnv): Promise<CachedAccessToken> {
  if (!env.firebaseClientEmail || !env.firebasePrivateKey) {
    throw new AppError(500, 'internal_error', 'Missing Firebase service-account credentials.');
  }

  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(env.firebasePrivateKey, 'RS256');
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/datastore',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setIssuer(env.firebaseClientEmail)
    .setSubject(env.firebaseClientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  if (!response.ok) {
    throw new AppError(503, 'provider_unavailable', 'Failed to fetch a Google access token.');
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token || !payload.expires_in) {
    throw new AppError(503, 'provider_unavailable', 'Google access token response was incomplete.');
  }

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in - 60) * 1000,
  };
}

export async function getGoogleAccessToken(env: AppEnv): Promise<string> {
  if (env.firestoreEmulatorHost) {
    return '';
  }

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.accessToken;
  }

  cachedAccessToken = await mintAccessToken(env);
  return cachedAccessToken.accessToken;
}
