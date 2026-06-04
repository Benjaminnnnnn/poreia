import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export function createDrizzleClient(databaseUrl: string) {
  const queryClient = postgres(databaseUrl, { prepare: false });
  return drizzle(queryClient);
}

export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
