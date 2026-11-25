import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Usage:
//   k6 run -e BASE_URL=https://katavi-farmer-hub.onrender.com loadtest/api.js
// Optional authenticated checks:
//   k6 run -e BASE_URL=... -e PHONE=07... -e PASSWORD=... loadtest/api.js

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const VUS = Number(__ENV.VUS || 20);
const DURATION = __ENV.DURATION || '2m';

const readErrors = new Rate('read_errors');
const tickerLatency = new Trend('ticker_latency', true);

export const options = {
  stages: [
    { duration: '30s', target: VUS },
    { duration: DURATION, target: VUS },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200'],
    read_errors: ['rate<0.02'],
    ticker_latency: ['p(95)<600'],
  },
};

const headers = { 'Content-Type': 'application/json' };

const getJson = (path, extraHeaders = {}) => {
  const res = http.get(`${BASE_URL}${path}`, { headers: { ...headers, ...extraHeaders }, tags: { endpoint: path } });
  const ok = check(res, {
    'status is 2xx/304': (r) => r.status >= 200 && r.status < 400,
    'json body present': (r) => (r.body || '').length > 0,
  });
  readErrors.add(!ok);
  return res;
};

export function setup() {
  let token = '';
  if (__ENV.PHONE && __ENV.PASSWORD) {
    const res = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ phone: __ENV.PHONE, password: __ENV.PASSWORD }),
      { headers }
    );
    if (res.status === 200) {
      token = res.json('token') || res.json('accessToken') || '';
    }
  }
  return { token };
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default function (data) {
  group('public reads', () => {
    getJson('/api/health');
    getJson('/api/v1/crops');
    getJson('/api/v1/crop-types');
    const ticker = getJson('/api/v1/market-prices/ticker');
    tickerLatency.add(ticker.timings.duration);
    getJson(pick(['/api/v1/input-products', '/api/v1/offers', '/api/v1/news']));
  });

  if (data.token) {
    group('authenticated reads', () => {
      getJson('/api/v1/orders', { Authorization: `Bearer ${data.token}` });
      getJson('/api/v1/notifications', { Authorization: `Bearer ${data.token}` });
    });
  }

  sleep(Math.random() * 2 + 0.5);
}
