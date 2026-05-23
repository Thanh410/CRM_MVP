// k6 user flow — mô phỏng 1 phiên làm việc thực tế của sales user
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authHeaders } from './auth.js';

/**
 * Think time — mô phỏng người dùng đọc/suy nghĩ giữa các action.
 * Random 1-4s để không tạo pattern quá đều (gây lock contention không thực tế).
 */
export function think(min = 1, max = 4) {
  sleep(min + Math.random() * (max - min));
}

/**
 * Chu trình full của 1 sales user trong giờ làm việc:
 *   1. Xem dashboard
 *   2. Xem danh sách leads
 *   3. Tạo lead mới (tỷ lệ 30%)
 *   4. Xem deals kanban
 *   5. Update stage 1 deal (tỷ lệ 50%)
 *   6. Xem notifications
 *   7. Xem tasks kanban
 *
 * Mỗi action có think time để mô phỏng người dùng thực.
 */
export function workdayFlow(accessToken) {
  const opts = authHeaders(accessToken);

  // 1. Dashboard
  let res = http.get(`${BASE_URL}/reporting/dashboard`, { ...opts, tags: { name: 'GET /reporting/dashboard' } });
  check(res, { 'dashboard 200': (r) => r.status === 200 });
  think();

  // 2. List leads (page 1)
  res = http.get(`${BASE_URL}/leads?page=1&limit=20`, { ...opts, tags: { name: 'GET /leads' } });
  check(res, { 'leads list 200': (r) => r.status === 200 });
  think();

  // 3. Tạo lead mới (30% xác suất)
  if (Math.random() < 0.3) {
    const newLead = {
      fullName: `Lead Test ${__VU}-${__ITER}`,
      email: `lead-${__VU}-${__ITER}-${Date.now()}@loadtest.vn`,
      phone: `0901${String(Date.now()).slice(-7)}`,
      source: 'website',
    };
    res = http.post(`${BASE_URL}/leads`, JSON.stringify(newLead), {
      ...opts,
      tags: { name: 'POST /leads' },
    });
    check(res, { 'lead created 201': (r) => r.status === 201 || r.status === 200 });
    think(1, 2);
  }

  // 4. Deals kanban
  res = http.get(`${BASE_URL}/deals/kanban`, { ...opts, tags: { name: 'GET /deals/kanban' } });
  check(res, { 'deals kanban 200': (r) => r.status === 200 });
  think();

  // 5. Move 1 deal stage (50% xác suất)
  if (Math.random() < 0.5) {
    try {
      const stages = res.json('stages');
      const firstStageWithDeals = stages?.find((s) => s.deals?.length > 0);
      const deal = firstStageWithDeals?.deals?.[0];
      const targetStage = stages?.[Math.min((stages.indexOf(firstStageWithDeals) + 1), stages.length - 1)];

      if (deal && targetStage && targetStage.id !== firstStageWithDeals.id) {
        const moveRes = http.patch(
          `${BASE_URL}/deals/${deal.id}/stage`,
          JSON.stringify({ stageId: targetStage.id }),
          { ...opts, tags: { name: 'PATCH /deals/:id/stage' } },
        );
        check(moveRes, { 'deal stage moved': (r) => r.status === 200 });
      }
    } catch {
      // ignore — không phải iteration nào cũng có deal để move
    }
    think(1, 2);
  }

  // 6. Notifications
  res = http.get(`${BASE_URL}/notifications`, { ...opts, tags: { name: 'GET /notifications' } });
  check(res, { 'notifications 200': (r) => r.status === 200 });
  think(0.5, 1.5);

  // 7. Tasks kanban
  res = http.get(`${BASE_URL}/tasks/kanban`, { ...opts, tags: { name: 'GET /tasks/kanban' } });
  check(res, { 'tasks kanban 200': (r) => r.status === 200 });
  think();
}

/**
 * Smoke flow — minimal request, chỉ verify endpoints alive
 */
export function smokeFlow(accessToken) {
  const opts = authHeaders(accessToken);

  const meRes = http.get(`${BASE_URL}/auth/me`, { ...opts, tags: { name: 'GET /auth/me' } });
  check(meRes, { 'auth/me 200': (r) => r.status === 200 });

  const dashRes = http.get(`${BASE_URL}/reporting/dashboard`, { ...opts, tags: { name: 'GET /reporting/dashboard' } });
  check(dashRes, { 'dashboard 200': (r) => r.status === 200 });
}
