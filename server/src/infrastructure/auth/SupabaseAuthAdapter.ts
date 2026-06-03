import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { AuthUser } from '../../types/domain';
import { AppError } from '../../core/errors';

type JWKSResolver = ReturnType<typeof createRemoteJWKSet>;

let cachedJWKS: JWKSResolver | null = null;
let cachedJwksUrl: string | null = null;

function getJWKS(supabaseUrl: string): JWKSResolver {
  const url = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  if (!cachedJWKS || cachedJwksUrl !== url) {
    cachedJwksUrl = url;
    cachedJWKS = createRemoteJWKSet(new URL(url));
  }
  return cachedJWKS;
}

export async function verifySupabaseToken(token: string, supabaseUrl: string): Promise<AuthUser> {
  try {
    const JWKS = getJWKS(supabaseUrl);
    const { payload } = await jwtVerify(token, JWKS, { algorithms: ['ES256'] });

    if (!payload.sub) {
      throw new AppError(401, 'unauthorized', 'Supabase token subject is missing.');
    }

    const meta = typeof payload.user_metadata === 'object' && payload.user_metadata !== null
      ? payload.user_metadata as Record<string, unknown>
      : {};

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      displayName: typeof meta.full_name === 'string' ? meta.full_name : null,
      photoURL: typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'unauthorized', 'Invalid or expired Supabase token.');
  }
}
