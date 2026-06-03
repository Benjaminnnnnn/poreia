import { jwtVerify } from 'jose';
import type { AuthUser } from '../../types/domain';
import { AppError } from '../../core/errors';

export async function verifySupabaseToken(token: string, jwtSecret: string): Promise<AuthUser> {
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

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
