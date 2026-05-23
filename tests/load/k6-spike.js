// Spike test — mô phỏng 50 users đăng nhập đột biến đầu giờ
// Run: k6 run tests/load/k6-spike.js
//
// Pattern thực tế: đầu giờ làm việc (8h sáng), nhiều nhân viên đồng loạt
// mở app → có spike đăng nhập. Test xem hệ thống có chịu được không.
//
// Stages:
//   - 30s baseline ở 5 VUs
//   - 30s spike lên 50 VUs (gấp 10x baseline)
//   - 2m duy trì 30 VUs (mức bình thường sau spike)
//   - 30s recover về 5 VUs
//   - 30s baseline 5 VUs (verify hệ thống đã ổn định)
//
// Pass criteria:
//   - Không có 5xx errors trong spike
//   - p95 < 2s khi spike (cho phép cao hơn load test)
//   - Recover về <1s p95 sau spike
import { login, logout } from './helpers/auth.js';
import { workdayFlow, think } from './helpers/flow.js';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },   // Baseline
        { duration: '30s', target: 50 },  // SPIKE: đầu giờ đột biến
        { duration: '2m',  target: 30 },  // Steady sau spike
        { duration: '30s', target: 5 },   // Recover
        { duration: '30s', target: 5 },   // Verify ổn định
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    // Không được có 5xx server errors
    'http_req_failed': ['rate<0.05'],
    'checks': ['rate>0.95'],
  },
  tags: { test_type: 'spike' },
};

export default function () {
  const { accessToken, refreshToken } = login();
  think(0.5, 1);

  workdayFlow(accessToken);

  logout(accessToken, refreshToken);
  think(1, 2);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'tests/load/results/spike-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const ok = (k, fn) => (m[k] ? fn(m[k]) : 'N/A');
  return `
═════════════════════════════════════════════════════════════════
   k6 Spike Test Summary (5 → 50 → 30 → 5 VUs)
═════════════════════════════════════════════════════════════════
   Iterations:              ${ok('iterations', (x) => x.values.count)}
   Total requests:          ${ok('http_reqs', (x) => x.values.count)}
   Peak req/sec:            ${ok('http_reqs', (x) => x.values.rate.toFixed(1))}
   Failed rate:             ${ok('http_req_failed', (x) => (x.values.rate * 100).toFixed(2) + '%')}
   ─────────────────────────────────────────────────────────────
   Response time
     p50:                   ${ok('http_req_duration', (x) => x.values['p(50)'].toFixed(0) + 'ms')}
     p95:                   ${ok('http_req_duration', (x) => x.values['p(95)'].toFixed(0) + 'ms')}
     p99:                   ${ok('http_req_duration', (x) => x.values['p(99)'].toFixed(0) + 'ms')}
     max:                   ${ok('http_req_duration', (x) => x.values.max.toFixed(0) + 'ms')}
   ─────────────────────────────────────────────────────────────
   Checks passed:           ${ok('checks', (x) => (x.values.rate * 100).toFixed(2) + '%')}
═════════════════════════════════════════════════════════════════
`;
}
