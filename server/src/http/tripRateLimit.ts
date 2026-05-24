const MAX_SHARE_REQUESTS = 30;
const SHARE_WINDOW_MS = 60_000; // 1 minute

export async function checkShareRateLimit(
  kv: KVNamespace,
  ip: string,
): Promise<RateLimitResult> {
  const windowKey = Math.floor(Date.now() / SHARE_WINDOW_MS);
  const key = `share_view:${ip}:${windowKey}`;
  const secondsIntoWindow = Math.floor((Date.now() % SHARE_WINDOW_MS) / 1000);
  const resetInSeconds = 60 - secondsIntoWindow;

  const current = Number((await kv.get(key)) ?? '0');

  if (current >= MAX_SHARE_REQUESTS) {
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  await kv.put(key, String(current + 1), { expirationTtl: 120 });

  return {
    allowed: true,
    remaining: MAX_SHARE_REQUESTS - current - 1,
    resetInSeconds,
  };
}

const MAX_TRIP_GENERATIONS = 5;
const WINDOW_MS = 3_600_000; // 1 hour in milliseconds
const TTL_SECONDS = 3600;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export async function checkTripGenerationLimit(
  kv: KVNamespace,
  userId: string,
): Promise<RateLimitResult> {
  const windowKey = Math.floor(Date.now() / WINDOW_MS);
  const key = `trip_gen:${userId}:${windowKey}`;
  const secondsIntoWindow = Math.floor((Date.now() % WINDOW_MS) / 1000);
  const resetInSeconds = TTL_SECONDS - secondsIntoWindow;

  const current = Number((await kv.get(key)) ?? '0');

  if (current >= MAX_TRIP_GENERATIONS) {
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  await kv.put(key, String(current + 1), { expirationTtl: TTL_SECONDS });

  return {
    allowed: true,
    remaining: MAX_TRIP_GENERATIONS - current - 1,
    resetInSeconds,
  };
}
