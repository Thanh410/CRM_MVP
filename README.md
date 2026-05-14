# CRM Vietnam

Hệ thống CRM production-ready cho doanh nghiệp vừa và nhỏ tại Việt Nam.  
Tích hợp Zalo OA và Facebook Messenger, phân quyền RBAC, audit log đầy đủ.

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Backend | NestJS 10 · TypeScript 5 · Prisma 5 |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 · BullMQ |
| Frontend | Next.js 14 App Router · React 18 |
| UI | Tailwind CSS · Lucide React |
| Forms | React Hook Form · Zod |
| State | TanStack Query v5 · Zustand |
| Auth | JWT (access 15m + refresh rotation 7 ngày) |
| Monorepo | pnpm workspace · Turborepo |

## Tính năng

| Module | Mô tả |
|---|---|
| **CRM Core** | Leads, Contacts, Companies, Deals — Kanban pipeline với kéo-thả |
| **Tasks & Projects** | Kanban nhiệm vụ, subtasks, comments, watchers |
| **Marketing** | Chiến dịch đa kênh: Email · Zalo · SMS · Messenger |
| **Omnichannel Chat** | Hộp thư hợp nhất Zalo OA + Facebook Messenger |
| **RBAC** | 7 vai trò, phân quyền chi tiết theo `resource:action` |
| **Audit Log** | Ghi log toàn bộ thao tác, export CSV |
| **Reporting** | Dashboard KPI, phễu bán hàng, leads theo nguồn, campaign stats |
| **Notifications** | In-app notifications realtime |

---

## Cài đặt Local

### Yêu cầu

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — `npm i -g pnpm`
- **Docker Desktop** đang chạy

### Bước 1 — Cấu hình môi trường

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

Chỉnh sửa `.env` nếu cần (giá trị mặc định chạy được ngay cho local).

### Bước 2 — Khởi động hạ tầng

```bash
docker compose up postgres redis minio -d
docker compose ps   # chờ STATUS = healthy
```

| Service | URL | Tài khoản mặc định |
|---|---|---|
| PostgreSQL | `localhost:5432` | `crm_user` / `crm_password_change_me` |
| Redis | `localhost:6379` | _(không cần pass)_ |
| MinIO Console | http://localhost:9001 | `minioadmin` / `minioadmin` |
| pgAdmin | http://localhost:5050 | Xem `PGADMIN_*` trong `.env` |

### Bước 3 — Cài dependencies

```bash
pnpm install
```

### Bước 4 — Khởi tạo database

```bash
pnpm db:generate   # generate Prisma client
pnpm db:migrate    # chạy tất cả migrations
pnpm db:seed       # seed dữ liệu demo tiếng Việt
```

### Bước 5 — Chạy dev

```bash
pnpm dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| API | http://localhost:3000/api |
| Swagger | http://localhost:3000/api/docs |

---

## Tài khoản demo

Mật khẩu chung: **`Admin@123456`**

| Email | Vai trò |
|---|---|
| `superadmin@abc.com.vn` | SUPER_ADMIN |
| `admin@abc.com.vn` | ADMIN |
| `manager.sales@abc.com.vn` | MANAGER |
| `sales1@abc.com.vn` | SALES |
| `marketing@abc.com.vn` | MARKETING |
| `support@abc.com.vn` | SUPPORT |

Dữ liệu seed: tổ chức mẫu, 5 pipeline stages, 10 leads, 3 contacts, 4 companies, 5 tags.

---

## Scripts

```bash
# Development
pnpm dev              # chạy tất cả apps song song
pnpm build            # build production
pnpm lint             # lint toàn workspace
pnpm test             # chạy test suite

# Docker
pnpm docker:up        # docker compose up -d
pnpm docker:down      # docker compose down
pnpm docker:logs      # docker compose logs -f

# Database
pnpm db:generate      # generate Prisma client (sau khi sửa schema)
pnpm db:migrate       # áp dụng migrations (safe cho production)
pnpm db:migrate:dev   # tạo + áp dụng migration mới (dev only)
pnpm db:seed          # seed demo data (idempotent — upsert)
pnpm db:studio        # Prisma Studio → http://localhost:5555
pnpm db:reset         # ⚠️ reset toàn bộ DB + re-seed (dev only)
```

---

## Biến môi trường

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Access token secret (≥ 32 ký tự) | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token secret (≥ 32 ký tự) | ✅ |
| `REDIS_URL` | Redis connection URL | Production |
| `ENCRYPTION_KEY` | Mã hóa channel credentials | Production |
| `FRONTEND_URL` | CORS origin cho API | Production |
| `ZALO_APP_SECRET` | Zalo OA app secret | Zalo |
| `ZALO_VERIFY_TOKEN` | Webhook verify token | Zalo |
| `META_APP_SECRET` | Facebook app secret | Messenger |
| `META_VERIFY_TOKEN` | Webhook verify token | Messenger |

---

## RBAC — Phân quyền

| Vai trò | Phạm vi |
|---|---|
| `SUPER_ADMIN` | Bypass tất cả, toàn hệ thống |
| `ADMIN` | Quản trị org: users, RBAC, audit + toàn bộ CRM |
| `MANAGER` | CRUD leads/deals/tasks + xem reports |
| `SALES` | Leads, contacts, deals của mình |
| `MARKETING` | Leads + campaigns + templates |
| `SUPPORT` | Đọc CRM + conversations |
| `STAFF` | Tasks của mình + đọc CRM |

Permission pattern: `resource:action` — ví dụ: `leads:create`, `deals:update`, `reports:read`

---

## API — Tổng quan

Base URL: `http://localhost:3000/api`  
Swagger UI: `http://localhost:3000/api/docs`  
Auth header: `Authorization: Bearer <accessToken>`

| Module | Endpoints | Ghi chú |
|---|---|---|
| Auth | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` | `login` và `refresh` không cần JWT |
| Leads | `GET/POST /leads` · `GET/PATCH/DELETE /leads/:id` · `POST /leads/:id/assign` · `POST /leads/:id/convert` · `GET /leads/export/csv` | CSV có BOM UTF-8 |
| Contacts | `GET/POST /contacts` · `GET/PATCH/DELETE /contacts/:id` | |
| Companies | `GET/POST /companies` · `GET/PATCH/DELETE /companies/:id` | |
| Deals | `GET/POST /deals` · `GET /deals/kanban` · `PATCH /deals/:id/stage` · `PATCH /deals/:id/won` · `PATCH /deals/:id/lost` | |
| Notes | `GET/POST /notes?entityType=&entityId=` · `PATCH/DELETE /notes/:id` | Polymorphic: LEAD · CONTACT · COMPANY · DEAL |
| Activities | `GET/POST /activities?entityType=&entityId=` | type: CALL · EMAIL · MEETING · NOTE · TASK |
| Tags | `GET/POST /tags` · `POST /tags/:id/entities` · `DELETE /tags/:id/entities/:type/:id` | |
| Tasks | `GET /tasks/kanban` · `GET/POST /tasks` · `PATCH /tasks/:id/status` · `POST /tasks/:id/comments` | Kanban: TODO · IN_PROGRESS · REVIEW · DONE |
| Projects | `GET/POST /projects` · `GET/PATCH/DELETE /projects/:id` | |
| Marketing | `GET/POST /marketing/campaigns` · `POST /campaigns/:id/launch` · `POST /campaigns/:id/pause` · `GET /campaigns/:id/summary` | channel: EMAIL · SMS · ZALO · MESSENGER |
| Conversations | `GET /conversations` · `PATCH /conversations/:id/assign` · `POST /conversations/:id/messages` | Tạo tự động từ webhook |
| Notifications | `GET /notifications` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` | |
| Users / RBAC | `GET/POST /users` · `POST /users/invite` · `GET /rbac/roles` · `GET /rbac/permissions` | |
| Reporting | `GET /reporting/dashboard` · `sales-funnel` · `leads-by-source` · `activities-timeline` · `campaign-stats` | |
| Webhooks | `GET/POST /integrations/zalo/webhook` · `GET/POST /integrations/messenger/webhook` | Không cần JWT |

---

## Tích hợp

### Zalo OA

1. Tạo OA tại [oa.zalo.me](https://oa.zalo.me) → **Cài đặt** → **Webhook**
2. Callback URL: `https://yourdomain.vn/api/integrations/zalo/webhook`
3. Subscribe events: `user_send_text`, `user_send_image`
4. Thêm vào `.env`:
   ```env
   ZALO_APP_SECRET=your_app_secret
   ZALO_VERIFY_TOKEN=any_custom_token
   ```
5. Tạo channel account trong DB:
   ```sql
   INSERT INTO channel_accounts (id, org_id, channel, name, credentials_enc, is_active)
   VALUES (gen_random_uuid(), '<org-id>', 'ZALO', 'Zalo OA',
           '{"accessToken":"<oa_access_token>"}', true);
   ```

### Facebook Messenger

1. Tạo Facebook App tại [developers.facebook.com](https://developers.facebook.com) → **Messenger** → **Webhooks**
2. Callback URL: `https://yourdomain.vn/api/integrations/messenger/webhook`
3. Subscribe: `messages`, `messaging_postbacks`
4. Thêm vào `.env`:
   ```env
   META_APP_SECRET=your_app_secret
   META_VERIFY_TOKEN=any_custom_token
   ```
5. Tạo channel account trong DB:
   ```sql
   INSERT INTO channel_accounts (id, org_id, channel, name, credentials_enc, is_active)
   VALUES (gen_random_uuid(), '<org-id>', 'MESSENGER', 'Facebook Page',
           '{"pageAccessToken":"<page_access_token>"}', true);
   ```

---

## Deploy Production (VPS)

### Yêu cầu

- Ubuntu 22.04 LTS · tối thiểu 4 CPU / 8 GB RAM
- Docker + Docker Compose v2

### Triển khai

```bash
# 1. Clone và cấu hình
git clone <repo-url> /opt/crm && cd /opt/crm
cp .env.example .env
# Chỉnh: POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL

# 2. SSL certificate
certbot certonly --standalone -d yourdomain.vn
mkdir -p docker/nginx/ssl
cp /etc/letsencrypt/live/yourdomain.vn/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.vn/privkey.pem docker/nginx/ssl/
sed -i 's/yourdomain.vn/your-domain.vn/g' docker/nginx/prod.conf

# 3. Build và khởi động
docker compose -f docker-compose.prod.yml up -d --build

# 4. Migrate database
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# 5. Kiểm tra logs
docker compose -f docker-compose.prod.yml logs -f api web
```

### Resource limits (docker-compose.prod.yml)

| Service | CPU | RAM |
|---|---|---|
| api | 1.5 core | 512 MB |
| web | 0.5 core | 256 MB |
| postgres | 1.0 core | 512 MB |
| redis | 0.5 core | 300 MB |
| nginx | 0.25 core | 64 MB |

---

## CI/CD (GitHub Actions)

File: `.github/workflows/ci.yml`  
Trigger: push / PR vào `main`, `master`, `develop`

| Job | Mô tả |
|---|---|
| `lint-and-build` | typecheck + lint + build tất cả apps |
| `test-api` | jest với PostgreSQL + Redis service containers |
| `deploy` | SSH deploy lên VPS (chỉ khi push vào `main`) |

**GitHub Secrets cần thiết:**

| Secret | Mô tả |
|---|---|
| `VPS_HOST` | IP của VPS |
| `VPS_USER` | SSH username (thường là `ubuntu`) |
| `VPS_SSH_KEY` | Nội dung private key (`cat ~/.ssh/id_rsa`) |

---

## Cấu trúc dự án

```
CRM/
├── apps/
│   ├── api/                        # NestJS 10 backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # 30+ tables, soft delete, multi-org
│   │   │   └── seed.ts             # Demo data tiếng Việt
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/           # JWT login · refresh · logout
│   │       │   ├── users/          # CRUD + invite
│   │       │   ├── organizations/  # Org · phòng ban · nhóm
│   │       │   ├── rbac/           # Roles & permissions
│   │       │   ├── audit/          # Audit log
│   │       │   ├── notifications/  # In-app notifications
│   │       │   ├── crm/
│   │       │   │   ├── leads/      # CRUD · assign · convert · CSV import/export
│   │       │   │   ├── contacts/
│   │       │   │   ├── companies/
│   │       │   │   ├── deals/      # Kanban · pipeline stages
│   │       │   │   ├── notes/      # Polymorphic notes
│   │       │   │   ├── activities/
│   │       │   │   └── tags/
│   │       │   ├── tasks/          # Kanban · comments · watchers
│   │       │   ├── projects/
│   │       │   ├── marketing/      # Campaigns · templates
│   │       │   ├── conversations/  # Unified inbox
│   │       │   ├── integrations/
│   │       │   │   ├── zalo/       # Zalo OA webhook adapter
│   │       │   │   └── messenger/  # Meta Messenger webhook adapter
│   │       │   └── reporting/
│   │       └── common/             # Guards · filters · interceptors · DTOs
│   │
│   └── web/                        # Next.js 14 App Router
│       └── src/
│           ├── app/
│           │   ├── (auth)/         # login · forgot-password · reset-password
│           │   └── (dashboard)/    # dashboard · leads · contacts · companies
│           │                       # deals · tasks · projects · marketing
│           │                       # inbox · users · audit · settings
│           ├── components/
│           │   └── layout/         # Sidebar (dropdown hover) · Header
│           ├── hooks/              # TanStack Query hooks theo module
│           ├── lib/                # axios client · utils
│           └── store/              # Zustand auth store
│
├── packages/
│   └── types/                      # Shared TypeScript types
│
├── docker/nginx/
│   ├── dev.conf                    # Local reverse proxy
│   └── prod.conf                   # Production HTTPS + HSTS
│
├── docker-compose.yml              # Local dev (7 services)
├── docker-compose.prod.yml         # Production với resource limits
├── .env.example                    # Template biến môi trường
└── turbo.json                      # Build pipeline config
```

---

## Ghi chú phát triển

- **Soft delete** — không xóa cứng record. Mọi query cần `where: { deletedAt: null }`
- **Multi-tenancy** — `orgId` bắt buộc trên mọi query; dùng decorator `@OrgId()` trong controller
- **Public routes** — dùng `@Public()` để bypass JWT guard (webhooks, `/auth/login`)
- **Migrations** — `pnpm db:migrate:dev --name <tên>` khi thay đổi `schema.prisma`
- **Seed** — idempotent, dùng `upsert`, an toàn khi chạy nhiều lần
