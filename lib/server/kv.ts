type RedisArg = string | number;

export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  sismember(key: string, member: string): Promise<boolean>;
  sadd(key: string, member: string): Promise<void>;
  scard(key: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
}

type MemoryState = {
  values: Map<string, { value: string; expiresAt: number }>;
  sets: Map<string, Set<string>>;
  counters: Map<string, number>;
};

declare global {
  var __prepifyMemoryKv: MemoryState | undefined;
}

const memoryState =
  globalThis.__prepifyMemoryKv ??
  (globalThis.__prepifyMemoryKv = {
    values: new Map<string, { value: string; expiresAt: number }>(),
    sets: new Map<string, Set<string>>(),
    counters: new Map<string, number>(),
  });

const memoryKv: KV = {
  async get(key) {
    const entry = memoryState.values.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryState.values.delete(key);
      return null;
    }

    return entry.value;
  },
  async set(key, value, ttlSeconds) {
    memoryState.values.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
    });
  },
  async incr(key) {
    const nextValue = (memoryState.counters.get(key) ?? 0) + 1;
    memoryState.counters.set(key, nextValue);
    return nextValue;
  },
  async expire(key, ttlSeconds) {
    const entry = memoryState.values.get(key);
    if (!entry) {
      return;
    }

    memoryState.values.set(key, {
      value: entry.value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },
  async sismember(key, member) {
    return memoryState.sets.get(key)?.has(member) ?? false;
  },
  async sadd(key, member) {
    const set = memoryState.sets.get(key) ?? new Set<string>();
    set.add(member);
    memoryState.sets.set(key, set);
  },
  async scard(key) {
    return memoryState.sets.get(key)?.size ?? 0;
  },
  async smembers(key) {
    return Array.from(memoryState.sets.get(key) ?? []);
  },
};

function createRedisKv(url: string, token: string): KV {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const command = async <T>(...args: RedisArg[]): Promise<T> => {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(args),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Redis command failed with ${response.status}`);
    }

    const payload = (await response.json()) as { result?: T };
    return payload.result as T;
  };

  return {
    async get(key) {
      return (await command<string | null>("GET", key)) ?? null;
    },
    async set(key, value, ttlSeconds) {
      if (ttlSeconds) {
        await command("SET", key, value, "EX", ttlSeconds);
        return;
      }

      await command("SET", key, value);
    },
    async incr(key) {
      return await command<number>("INCR", key);
    },
    async expire(key, ttlSeconds) {
      await command("EXPIRE", key, ttlSeconds);
    },
    async sismember(key, member) {
      return Boolean(await command<number>("SISMEMBER", key, member));
    },
    async sadd(key, member) {
      await command("SADD", key, member);
    },
    async scard(key) {
      return await command<number>("SCARD", key);
    },
    async smembers(key) {
      return (await command<string[]>("SMEMBERS", key)) ?? [];
    },
  };
}

export const kv: KV =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? createRedisKv(
        process.env.UPSTASH_REDIS_REST_URL,
        process.env.UPSTASH_REDIS_REST_TOKEN,
      )
    : memoryKv;
