// Load test — mô phỏng 30 sales users giờ làm việc bệnh viện tầm trung
// Run: k6 run tests/load/k6-load.js
//
// Stages:
//   - Ramp up 1 min từ 0 → 30 VUs
//   - Steady 8 min ở 30 VUs (mô phỏng 1 giờ cao điểm)
//   - Ramp down 1 min từ 30 → 0
//
// Pass criteria (đảm bảo UX tốt cho bệnh viện tầm trung):
//   - p95 < 1s cho mọi request
//   - p99 < 2s cho mọi request
//   - Error rate < 1%
//   - Checks pass rate > 99%
import { login, logout } from './helpers/auth.js';
import { workdayFlow, think } from './helpers/flow.js';

export const options = {
  scenarios: {
    workday: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 30 },  // Ramp up
        { duration: '8m', target: 30 },  // Steady
        { duration: '1m', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.01'],
    'checks': ['rate>0.99'],
    // Theo endpoint cụ thể
    'http_req_duration{name:GET /reporting/dashboard}': ['p(95)<800'],
    'http_req_duration{name:GET /leads}': ['p(95)<600'],
    'http_req_duration{name:GET /deals/kanban}': ['p(95)<800'],
    'http_req_duration{name:POST /leads}': ['p(95)<1000'],
    'http_req_duration{name:auth/login}': ['p(95)<800'],
  },
  tags: { test_type: 'load' },
};

export default function () {
  // Login 1 lần đầu iteration, dùng token cho tới logout
  const { accessToken, refreshToken } = login();
  think(0.5, 1);

  // Mỗi iteration là 1 phiên làm việc 20-40s
  workdayFlow(accessToken);

  logout(accessToken, refreshToken);
  think(1, 3);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'tests/load/results/load-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const ok = (k, fn) => (m[k] ? fn(m[k]) : 'N/A');
  return `
═════════════════════════════════════════════════════════════════
   k6 Load Test Summary (30 VUs × 10 min)
═════════════════════════════════════════════════════════════════
   Iterations completed:    ${ok('iterations', (x) => x.values.count)}
   Total requests:          ${ok('http_reqs', (x) => x.values.count)}
   Requests/sec:            ${ok('http_reqs', (x) => x.values.rate.toFixed(1))}
   Failed rate:             ${ok('http_req_failed', (x) => (x.values.rate * 100).toFixed(2) + '%')}
   ─────────────────────────────────────────────────────────────
   Response time
     p50:                   ${ok('http_req_duration', (x) => x.values['p(50)'].toFixed(0) + 'ms')}
     p95:                   ${ok('http_req_duration', (x) => x.values['p(95)'].toFixed(0) + 'ms')}
     p99:                   ${ok('http_req_duration', (x) => x.values['p(99)'].toFixed(0) + 'ms')}
     max:                   ${ok('http_req_duration', (x) => x.values.max.toFixed(0) + 'ms')}
   ─────────────────────────────────────────────────────────────
   Checks passed:           ${ok('checks', (x) => (x.values.rate * 100).toFixed(2) + '%')}
   Data received:           ${ok('data_received', (x) => (x.values.count / 1e6).toFixed(1) + ' MB')}
   Data sent:               ${ok('data_sent', (x) => (x.values.count / 1e6).toFixed(1) + ' MB')}
═════════════════════════════════════════════════════════════════
`;
}
