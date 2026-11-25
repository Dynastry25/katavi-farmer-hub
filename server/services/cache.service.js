const NodeCache = require('node-cache');

const TTL = {
  REFERENCE: 600,
  LISTING: 60,
  PRICE: 60,
  BASELINE: 1800,
};

const PREFIX = 'katavi:ekilimo:';

// In-process fallback so a missing or unreachable Redis degrades to per-instance
// caching instead of failing requests or hammering MongoDB.
const MAX_KEYS = Math.max(Number(process.env.CACHE_MAX_KEYS) || 5000, 100);

const memory = new NodeCache({
  stdTTL: TTL.LISTING,
  checkperiod: 60,
  useClones: false,
  maxKeys: MAX_KEYS,
});

let redisClient;
let redisReady = false;
let redisWarned = false;
let hits = 0;
let misses = 0;

const warn = (message) => {
  if (redisWarned) return;
  redisWarned = true;
  console.warn(`[cache] ${message}. Falling back to in-process cache.`);
};

const isRedisReady = () => Boolean(redisReady);

const getRedis = () => {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) {
    redisClient = null;
    return null;
  }

  try {
    // Lazy require keeps deployments without REDIS_URL free of the dependency
    // cost and avoids opening sockets during tests.
    const Redis = require('ioredis');
    redisClient = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });
    redisClient.on('ready', () => {
      redisReady = true;
      console.log('[cache] Redis connected');
    });
    redisClient.on('close', () => {
      redisReady = false;
    });
    redisClient.on('error', (error) => {
      redisReady = false;
      warn(`Redis error (${error.message})`);
    });
    redisClient.connect().catch((error) => {
      warn(`Redis connection failed (${error.message})`);
    });
  } catch (error) {
    redisClient = null;
    warn(`Redis unavailable (${error.message})`);
  }

  return redisClient;
};

const key = (name) => `${PREFIX}${name}`;

const deserialize = (raw) => {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const get = async (name) => {
  if (!name) return null;
  const fullKey = key(name);

  if (isRedisReady()) {
    try {
      const raw = await redisClient.get(fullKey);
      if (raw !== null) {
        hits += 1;
        return deserialize(raw);
      }
      misses += 1;
      return null;
    } catch (error) {
      warn(`Redis GET failed (${error.message})`);
    }
  }

  const local = memory.get(fullKey);
  if (local === undefined) {
    misses += 1;
    return null;
  }
  hits += 1;
  return local;
};

const set = async (name, value, ttl = TTL.LISTING) => {
  if (!name || value === undefined) return;
  const fullKey = key(name);

  if (isRedisReady()) {
    try {
      await redisClient.set(fullKey, JSON.stringify(value), 'EX', Math.max(1, Number(ttl) || TTL.LISTING));
      return;
    } catch (error) {
      warn(`Redis SET failed (${error.message})`);
    }
  }

  memory.set(fullKey, value, Math.max(1, Number(ttl) || TTL.LISTING));
};

const del = async (...names) => {
  const keys = names.filter(Boolean).map(key);
  if (!keys.length) return;

  if (isRedisReady()) {
    try {
      await redisClient.del(...keys);
    } catch (error) {
      warn(`Redis DEL failed (${error.message})`);
    }
  }

  memory.del(keys);
};

const delByPrefix = async (namePrefix) => {
  if (!namePrefix) return;
  const match = `${PREFIX}${namePrefix}*`;

  if (isRedisReady()) {
    try {
      let cursor = '0';
      do {
        const [next, batch] = await redisClient.scan(cursor, 'MATCH', match, 'COUNT', 100);
        cursor = next;
        if (batch.length) await redisClient.del(...batch);
      } while (cursor !== '0');
    } catch (error) {
      warn(`Redis SCAN failed (${error.message})`);
    }
  }

  for (const localKey of memory.keys()) {
    if (localKey.startsWith(`${PREFIX}${namePrefix}`)) memory.del(localKey);
  }
};

// Cache-aside helper: callers pass the database loader so misses are obvious and
// cache failures never break the request path.
const remember = async (name, ttl, loader) => {
  const cached = await get(name);
  if (cached !== null) return cached;

  const value = await loader();
  if (value !== null && value !== undefined) {
    await set(name, value, ttl);
  }
  return value;
};

const stats = () => {
  const total = hits + misses;
  return {
    backend: isRedisReady() ? 'redis' : 'memory',
    entries: memory.getStats().keys,
    hits,
    misses,
    hitRate: total === 0 ? 0 : Number((hits / total).toFixed(3)),
  };
};

// Credentials never leave the process; health output only names the host.
const maskRedisUrl = (url = '') => {
  try {
    const parsed = new URL(url);
    const auth = parsed.username || parsed.password ? '***@' : '';
    return `${parsed.protocol}//${auth}${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return 'configured';
  }
};

const health = async () => {
  const configured = Boolean(process.env.REDIS_URL);
  let latencyMs = null;
  if (configured && isRedisReady()) {
    const started = Date.now();
    try {
      await redisClient.ping();
      latencyMs = Date.now() - started;
    } catch (error) {
      redisReady = false;
      warn(`Redis PING failed (${error.message})`);
    }
  }
  return {
    configured,
    ready: isRedisReady(),
    latencyMs,
    host: configured ? maskRedisUrl(process.env.REDIS_URL) : '',
    maxKeys: MAX_KEYS,
    ...stats(),
  };
};

const close = async () => {
  if (redisClient && typeof redisClient.quit === 'function') {
    try {
      await redisClient.quit();
    } catch (error) {
      console.warn(`[cache] Redis shutdown failed (${error.message})`);
    }
  }
  redisClient = undefined;
  redisReady = false;
};

module.exports = {
  TTL,
  get,
  set,
  del,
  delByPrefix,
  remember,
  stats,
  health,
  close,
  maskRedisUrl,
};
