import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AuthUser } from '../types/domain';
import { AppError } from '../core/errors';

const firebaseJwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export async function verifyFirebaseIdToken(token: string, projectId: string): Promise<AuthUser> {
  try {
    const { payload } = await jwtVerify(token, firebaseJwks, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new AppError(401, 'unauthorized', 'Firebase token subject is missing.');
    }

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      displayName: typeof payload.name === 'string' ? payload.name : null,
      photoURL: typeof payload.picture === 'string' ? payload.picture : null,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, 'unauthorized', 'Invalid Firebase ID token.');
  }
}
