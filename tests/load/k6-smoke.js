// Smoke test — verify hệ thống chạy được trước khi load test
// Run: k6 run tests/load/k6-smoke.js
//      BASE_URL=http://localhost:3000/api k6 run tests/load/k6-smoke.js
import { login, logout } from './helpers/auth.js';
import { smokeFlow, think } from './helpers/flow.js';

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    // Smoke: p95 dưới 500ms, error rate < 0.1%
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.001'],
    'checks': ['rate>0.99'],
  },
  tags: { test_type: 'smoke' },
};

export default function () {
  const { accessToken, refreshToken } = login();
  smokeFlow(accessToken);
  think(2, 3);
  logout(accessToken, refreshToken);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'tests/load/results/smoke-summary.json': JSON.stringify(data, null, 2),
  };
}

// Inline minimal text summary để khỏi import k6-summary lib
function textSummary(data) {
  const m = data.metrics;
  const ok = (k, fn) => (m[k] ? fn(m[k]) : 'N/A');
  return `
═════════════════════════════════════════════════════════════
   k6 Smoke Test Summary
═════════════════════════════════════════════════════════════
   Iterations:       ${ok('iterations', (x) => x.values.count)}
   Requests:         ${ok('http_reqs', (x) => x.values.count)}
   Failed rate:      ${ok('http_req_failed', (x) => (x.values.rate * 100).toFixed(2) + '%')}
   p50 duration:     ${ok('http_req_duration', (x) => x.values['p(50)'].toFixed(0) + 'ms')}
   p95 duration:     ${ok('http_req_duration', (x) => x.values['p(95)'].toFixed(0) + 'ms')}
   p99 duration:     ${ok('http_req_duration', (x) => x.values['p(99)'].toFixed(0) + 'ms')}
   Checks passed:    ${ok('checks', (x) => (x.values.rate * 100).toFixed(2) + '%')}
═════════════════════════════════════════════════════════════
`;
}
