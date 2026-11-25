// Dependency-free smoke load test: records latency percentiles and status codes
// for the public endpoints the mobile app hits on startup.
// Usage: node loadtest/smoke.mjs [baseUrl] [durationSeconds] [concurrency]
const BASE_URL = (process.argv[2] || process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const DURATION = Math.max(3, Number(process.argv[3]) || 15);
const CONCURRENCY = Math.max(1, Number(process.argv[4]) || 10);

const ENDPOINTS = [
  '/api/health',
  '/api/v1/crop-types',
  '/api/v1/market-prices',
  '/api/v1/products',
  '/api/v1/news',
];

const samples = [];
const statuses = new Map();
const deadline = Date.now() + DURATION * 1000;

const record = (endpoint, status, ms) => {
  samples.push({ endpoint, status, ms });
  const key = `${endpoint} ${status}`;
  statuses.set(key, (statuses.get(key) || 0) + 1);
};

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
};

const worker = async () => {
  while (Date.now() < deadline) {
    const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
    const started = performance.now();
    let status = 0;
    try {
      // The API rate-limits anonymous clients per token hash, so a unique token
      // per request simulates many distinct devices instead of one hot IP.
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer load-${crypto.randomUUID()}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      status = res.status;
      await res.arrayBuffer();
    } catch {
      status = -1;
    }
    record(endpoint, status, Math.round(performance.now() - started));
  }
};

const startedAt = new Date().toISOString();
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const durations = samples.map((sample) => sample.ms);
const failures = samples.filter((sample) => sample.status < 200 || sample.status >= 400).length;
const summary = {
  baseUrl: BASE_URL,
  startedAt,
  durationSeconds: DURATION,
  concurrency: CONCURRENCY,
  requests: samples.length,
  requestsPerSecond: Number((samples.length / DURATION).toFixed(1)),
  failures,
  failureRate: samples.length ? Number((failures / samples.length).toFixed(4)) : 0,
  latencyMs: {
    min: Math.min(...durations),
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    max: Math.max(...durations),
  },
  byEndpoint: ENDPOINTS.map((endpoint) => {
    const rows = samples.filter((sample) => sample.endpoint === endpoint);
    const ms = rows.map((row) => row.ms);
    return {
      endpoint,
      requests: rows.length,
      errors: rows.filter((row) => row.status < 200 || row.status >= 400).length,
      p95: percentile(ms, 95),
    };
  }),
  statuses: Object.fromEntries([...statuses.entries()].sort()),
};

console.log(JSON.stringify(summary, null, 2));
