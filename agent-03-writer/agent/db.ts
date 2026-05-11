import postgres from 'postgres';
import { resolve4 } from 'node:dns/promises';

let clientPromise: Promise<ReturnType<typeof postgres>> | null = null;

async function build() {
  const rawUrl = process.env.DATABASE_URL;
  const hasPassword = !!process.env.DB_PASSWORD;

  console.log('[db] DATABASE_URL set:', !!rawUrl);
  console.log('[db] DB_PASSWORD set:', hasPassword);

  if (!rawUrl) throw new Error('DATABASE_URL must be set');

  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname;
    console.log('[db] hostname from URL:', hostname);
  } catch (e) {
    throw new Error(`[db] failed to parse DATABASE_URL: ${e}`);
  }

  let host: string | undefined;
  try {
    const addrs = await resolve4(hostname);
    console.log('[db] resolve4 results:', addrs);
    host = addrs[0];
  } catch (e) {
    console.warn('[db] resolve4 failed — will let postgres.js resolve:', e);
  }

  const opts = {
    ...(host ? { host } : {}),
    ssl: 'require' as const,
    password: process.env.DB_PASSWORD,
    prepare: false, // required for Supabase Transaction Pooler
  };
  console.log('[db] connecting with host override:', host ?? '(none)');

  const client = postgres(rawUrl, opts);

  try {
    await client`SELECT 1`;
    console.log('[db] connection OK');
  } catch (e) {
    console.error('[db] connection probe failed:', e);
    throw e;
  }

  return client;
}

export function getDb() {
  if (!clientPromise) clientPromise = build();
  return clientPromise;
}
