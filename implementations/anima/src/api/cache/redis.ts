import { Redis } from 'ioredis';

let client: Redis | null = null;

function getClient(): Redis | null {
  if (client) return client;
  const url = process.env['REDIS_URL'];
  if (!url) return null;
  try {
    client = new Redis(url, { lazyConnect: true, enableOfflineQueue: false });
    client.on('error', () => { client = null; });
    return client;
  } catch {
    return null;
  }
}

export async function cacheGet<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const redis = getClient();
  if (!redis) return fn();
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
    const result = await fn();
    await redis.setex(key, ttlSeconds, JSON.stringify(result));
    return result;
  } catch {
    return fn();
  }
}

export async function cacheInvalidate(...keys: string[]): Promise<void> {
  const redis = getClient();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // non-fatal
  }
}

export const CACHE_TTL = 60;
