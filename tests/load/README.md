# CRM Load Tests (k6)

Load testing scenarios cho CRM bệnh viện tầm trung **20-30 users đồng thời**.

## Cài đặt k6

```bash
# Windows (Chocolatey)
choco install k6

# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

Verify: `k6 version`

## Chuẩn bị

1. **Khởi động full stack:**
   ```bash
   docker compose up -d
   sleep 30   # chờ services healthy
   ```

2. **Seed database** với 10 demo users:
   ```bash
   pnpm --filter api db:seed
   ```

   Các test dùng 10 demo accounts `superadmin@abc.com.vn`, `admin@abc.com.vn`, `sales1@abc.com.vn` ... với password chung `Admin@123456` (round-robin theo VU index).

3. **Tạo thư mục results:**
   ```bash
   mkdir -p tests/load/results
   ```

## Chạy test

### 1. Smoke test (1 phút, 1 VU)
Verify hệ thống chạy được trước khi load test.

```bash
k6 run tests/load/k6-smoke.js
```

**Pass criteria:** p95 < 500ms, error rate < 0.1%, checks > 99%

### 2. Load test (10 phút, 30 VUs)
Mô phỏng 30 sales users làm việc giờ cao điểm bệnh viện.

```bash
k6 run tests/load/k6-load.js
```

**Pass criteria:**
- p95 < 1s, p99 < 2s
- Error rate < 1%
- Dashboard p95 < 800ms
- POST /leads p95 < 1s

### 3. Spike test (5 phút, peak 50 VUs)
Mô phỏng đột biến đầu giờ làm việc (50 users login cùng lúc).

```bash
k6 run tests/load/k6-spike.js
```

**Pass criteria:**
- p95 < 2s khi spike
- Không 5xx errors
- Recover về <1s p95 sau spike

### Override URL hoặc users

```bash
# Test trên staging
BASE_URL=https://staging.crm.bv.vn/api k6 run tests/load/k6-load.js

# Custom number of VUs
k6 run -u 50 -d 5m tests/load/k6-load.js
```

## Đọc kết quả

K6 in summary ra stdout. Ngoài ra mỗi test lưu JSON chi tiết:

- `tests/load/results/smoke-summary.json`
- `tests/load/results/load-summary.json`
- `tests/load/results/spike-summary.json`

### Metric quan trọng

| Metric | Ý nghĩa | Mức chấp nhận |
|---|---|---|
| `http_req_duration p(95)` | 95% requests nhanh hơn ngưỡng này | < 1s (load), < 2s (spike) |
| `http_req_failed rate` | Tỷ lệ request fail (network/5xx) | < 1% |
| `checks rate` | Tỷ lệ assertion pass | > 99% |
| `iterations` | Tổng số user sessions hoàn thành | — |
| `http_reqs rate` | Throughput (req/s) | — (tham khảo) |

### Khi test fail

1. **p95 cao** → check:
   - DB connection pool: `SELECT count(*) FROM pg_stat_activity;`
   - Slow queries: `SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;`
   - API container CPU/RAM: `docker stats`

2. **Error rate cao** → check API logs:
   ```bash
   docker compose logs api --tail 200 | grep -E "ERROR|WARN"
   ```

3. **Spike fail** → nghĩ về:
   - Tăng connection_limit trong DATABASE_URL
   - Bật Redis cache cho `/reporting/dashboard`
   - Scale API replicas (docker-compose.prod.yml: replicas: 2)

## Tích hợp CI (tham khảo)

```yaml
# .github/workflows/load-test.yml
name: Load Test
on:
  workflow_dispatch:        # chỉ chạy manual
  schedule:
    - cron: '0 2 * * 0'    # Chủ Nhật 2h sáng

jobs:
  load:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: docker compose up -d && sleep 60
      - run: k6 run tests/load/k6-smoke.js
      - run: k6 run tests/load/k6-load.js
      - uses: actions/upload-artifact@v4
        with: { name: load-results, path: tests/load/results/ }
```

## Endpoints được test

Chu trình `workdayFlow()` mô phỏng 1 phiên 30-60s:

```
POST /auth/login          → lấy token
GET  /reporting/dashboard → xem KPI tổng hợp
GET  /leads               → danh sách leads (page 1)
POST /leads               → tạo lead mới (30% iteration)
GET  /deals/kanban        → xem deals kanban
PATCH /deals/:id/stage    → drag deal sang stage khác (50% iteration)
GET  /notifications       → thông báo
GET  /tasks/kanban        → tasks kanban
POST /auth/logout         → revoke token
```

Mỗi action có think time 1-4s (random) để mô phỏng người dùng thực — không tạo pattern quá đều gây lock contention.
