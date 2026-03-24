# CRM MVP – Doanh nghiệp Việt Nam

> Hệ thống CRM production-ready cho SME Việt Nam
> **NestJS 10** · **Next.js 14** · **PostgreSQL 16** · **Redis** · **Docker Compose**

---

## Tính năng

| Module | Mô tả |
|--------|-------|
| **CRM Core** | Leads, Contacts, Companies, Deals (Kanban pipeline) |
| **Tasks & Projects** | Kanban nhiệm vụ, dự án theo phòng ban, subtasks, comments |
| **Marketing** | Chiến dịch đa kênh (Email, Zalo, SMS), mẫu tin, audience filter |
| **Omnichannel Chat** | Hộp thư thống nhất Zalo OA + Messenger, gán agent |
| **RBAC** | 7 vai trò, phân quyền chi tiết theo `resource:action` |
| **Audit Log** | Ghi log toàn bộ thao tác CUD, export |
| **Reporting** | Dashboard tổng quan, phễu bán hàng, leads theo nguồn |

---

## Cấu trúc dự án

```
CRM/
├── apps/
│   ├── api/                    # NestJS 10 backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 30+ tables, soft delete, multi-org
│   │   │   └── seed.ts         # Demo data tiếng Việt
│   │   └── src/modules/
│   │       ├── auth/           # JWT login/refresh/logout
│   │       ├── users/          # CRUD + invite
│   │       ├── organizations/  # Org, phòng ban, nhóm
│   │       ├── rbac/           # Roles & permissions
│   │       ├── audit/          # Audit log
│   │       ├── notifications/  # In-app notifications
│   │       ├── crm/
│   │       │   ├── leads/      # CRUD, assign, convert, CSV import/export
│   │       │   ├── contacts/   # CRUD
│   │       │   ├── companies/  # CRUD
│   │       │   ├── deals/      # CRUD, kanban, pipeline stages
│   │       │   ├── notes/      # Polymorphic notes
│   │       │   ├── activities/ # Activity log
│   │       │   └── tags/       # Tags + entity tagging
│   │       ├── tasks/          # Kanban tasks, comments, watchers
│   │       ├── projects/       # Projects scoped by dept
│   │       ├── marketing/      # Campaigns + templates
│   │       ├── conversations/  # Unified inbox
│   │       ├── integrations/
│   │       │   ├── zalo/       # Zalo OA webhook adapter
│   │       │   └── messenger/  # Meta Messenger webhook adapter
│   │       └── reporting/      # Dashboard & stats queries
│   │
│   └── web/                    # Next.js 14 App Router
│       └── src/app/
│           ├── (auth)/login/   # Trang đăng nhập
│           └── (dashboard)/
│               ├── dashboard/  # Tổng quan số liệu
│               ├── leads/      # Bảng leads + export CSV
│               ├── contacts/   # Bảng liên hệ
│               ├── companies/  # Grid card công ty
│               ├── deals/      # Kanban cơ hội kinh doanh
│               ├── tasks/      # Kanban nhiệm vụ
│               ├── marketing/  # Quản lý chiến dịch
│               └── inbox/      # Chat Zalo + Messenger
│
├── packages/
│   └── types/                  # Shared TypeScript types
│
├── docker/nginx/
│   ├── dev.conf                # Local dev reverse proxy
│   └── prod.conf               # Production HTTPS + HSTS
│
├── .github/workflows/ci.yml    # GitHub Actions CI/CD
├── docker-compose.yml          # Local dev (7 services)
├── docker-compose.prod.yml     # Production (resource limits)
└── .env.example                # Template biến môi trường
```

---

## Setup Local Development

### Yêu cầu

- **Node.js** 20+ — [nodejs.org](https://nodejs.org)
- **pnpm** 9+ — `npm install -g pnpm`
- **Docker Desktop** đang chạy — [docker.com](https://www.docker.com/products/docker-desktop)

### Bước 1 – Cấu hình môi trường

```bash
# Copy env template (2 nơi)
cp .env.example .env
cp .env.example apps/api/.env
```

> Giá trị mặc định trong `.env.example` hoạt động cho local dev.
> File `apps/api/.env` cần thiết để Prisma CLI đọc `DATABASE_URL`.

### Bước 2 – Khởi động hạ tầng

```bash
docker compose up postgres redis minio -d

# Kiểm tra trạng thái (chờ STATUS = healthy)
docker compose ps
```

| Service | URL | Tài khoản |
|---------|-----|-----------|
| PostgreSQL | `localhost:5432` | `crm_user` / `crm_password_change_me` |
| Redis | `localhost:6379` | _(không cần pass khi local)_ |
| MinIO Console | http://localhost:9001 | `minioadmin` / `minioadmin` |
| pgAdmin | http://localhost:5050 | Xem `PGADMIN_EMAIL/PASSWORD` trong `.env` |

### Bước 3 – Cài dependencies

```bash
pnpm install
```

### Bước 4 – Khởi tạo database

```bash
# Generate Prisma client
pnpm db:generate

# Chạy migrations (tạo tất cả tables)
pnpm db:migrate

# Seed dữ liệu demo tiếng Việt
pnpm db:seed
```

### Bước 5 – Chạy dev servers

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3001 |
| **API** | http://localhost:3000/api |
| **Swagger UI** | http://localhost:3000/api/docs |

---

## Tài khoản demo

Mật khẩu tất cả: **`Admin@123456`**

| Email | Họ tên | Vai trò |
|-------|--------|---------|
| `superadmin@abc.com.vn` | Trần Minh Khoa | SUPER_ADMIN |
| `admin@abc.com.vn` | Lê Thị Mai | ADMIN |
| `manager.sales@abc.com.vn` | Nguyễn Văn Hùng | MANAGER |
| `sales1@abc.com.vn` | Phạm Thị Lan | SALES |
| `sales2@abc.com.vn` | Vũ Quang Dũng | SALES |
| `marketing@abc.com.vn` | Hoàng Thu Hà | MARKETING |
| `support@abc.com.vn` | Đặng Thị Bình | SUPPORT |

**Dữ liệu seed có sẵn:**
- Tổ chức: Công ty ABC Việt Nam
- Pipeline bán hàng: 5 stages (Tiềm năng → Đã liên hệ → Đề xuất → Đàm phán → Chốt hợp đồng)
- 10 Leads, 3 Contacts, 4 Companies, 5 Tags

---

## Scripts

```bash
# Dev
pnpm dev              # Chạy tất cả apps song song (turborepo)
pnpm build            # Build production
pnpm lint             # Lint toàn bộ workspace
pnpm test             # Chạy tests

# Docker
pnpm docker:up        # docker compose up -d
pnpm docker:down      # docker compose down
pnpm docker:logs      # docker compose logs -f

# Database
pnpm db:generate      # Generate Prisma client (sau khi sửa schema)
pnpm db:migrate       # Áp dụng migrations (production-safe)
pnpm db:migrate:dev   # Tạo + áp dụng migration mới (dev)
pnpm db:seed          # Seed demo data (upsert – an toàn khi chạy lại)
pnpm db:studio        # Prisma Studio UI → http://localhost:5555
pnpm db:reset         # ⚠️ Reset toàn bộ DB + re-seed (dev only!)
```

---

## API Endpoints

Base URL: `http://localhost:3000/api`
Swagger docs: `http://localhost:3000/api/docs`

> **Auth header**: `Authorization: Bearer <accessToken>`
> Routes không cần JWT: `/auth/login`, `/auth/refresh`, `/integrations/*/webhook`

### Auth

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/auth/login` | Đăng nhập → `accessToken` + `refreshToken` |
| POST | `/auth/refresh` | Làm mới access token bằng refresh token |
| POST | `/auth/logout` | Thu hồi refresh token |
| GET | `/auth/me` | Thông tin user + danh sách permissions |

### CRM Core

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST | `/leads` | Danh sách + tạo (filter: status, source, search) |
| GET/PATCH/DELETE | `/leads/:id` | Chi tiết / cập nhật / xóa mềm |
| POST | `/leads/:id/assign` | Gán nhân viên phụ trách |
| POST | `/leads/:id/convert` | Convert lead → Contact |
| GET | `/leads/export` | Xuất CSV (UTF-8 BOM, hỗ trợ tiếng Việt) |
| POST | `/leads/import` | Import CSV hàng loạt |
| GET/POST | `/contacts` | Danh sách + tạo liên hệ |
| GET/PATCH/DELETE | `/contacts/:id` | Chi tiết / cập nhật / xóa |
| GET/POST | `/companies` | Danh sách + tạo công ty |
| GET/POST | `/deals` | Danh sách + tạo cơ hội |
| GET | `/deals/kanban` | Kanban grouped by pipeline stage + tổng giá trị |
| PATCH | `/deals/:id/stage` | Di chuyển sang stage khác |
| POST | `/deals/:id/won` | Đánh dấu thắng deal |
| POST | `/deals/:id/lost` | Đánh dấu thua deal |
| GET/POST | `/notes` | Ghi chú polymorphic (lead/contact/deal/...) |
| GET/POST | `/activities` | Nhật ký hoạt động (call, email, meeting...) |
| GET/POST/DELETE | `/tags` | Tags + gán entity |

### Tasks & Projects

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/tasks` | Danh sách (filter: mine, projectId, status, priority) |
| GET | `/tasks/kanban` | 4 cột: TODO / IN_PROGRESS / REVIEW / DONE |
| POST | `/tasks` | Tạo task (hỗ trợ subtask qua `parentId`) |
| PATCH | `/tasks/:id` | Cập nhật task |
| PATCH | `/tasks/:id/status` | Di chuyển status |
| POST | `/tasks/:id/comments` | Thêm comment |
| POST/DELETE | `/tasks/:id/watchers/:userId` | Thêm / xóa watcher |
| GET/POST | `/projects` | Dự án |
| GET | `/projects/:id` | Chi tiết dự án kèm task list |

### Marketing

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST | `/marketing/templates` | Mẫu tin nhắn |
| PATCH/DELETE | `/marketing/templates/:id` | Cập nhật / xóa mẫu |
| GET/POST | `/marketing/campaigns` | Chiến dịch |
| GET | `/marketing/campaigns/:id` | Chi tiết + logs |
| GET | `/marketing/campaigns/:id/summary` | Báo cáo: sent, open rate |
| POST | `/marketing/campaigns/:id/launch` | Kích hoạt chiến dịch |
| POST | `/marketing/campaigns/:id/pause` | Tạm dừng |
| POST | `/marketing/audience/preview` | Xem trước số lượng audience |

### Omnichannel Chat

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/conversations` | Hộp thư (filter: OPEN/PENDING/CLOSED) |
| GET | `/conversations/:id` | Chi tiết + toàn bộ tin nhắn |
| PATCH | `/conversations/:id/assign` | Gán nhân viên phụ trách |
| PATCH | `/conversations/:id/status` | Đổi trạng thái |
| PATCH | `/conversations/:id/link` | Liên kết với contact hoặc lead |
| POST | `/conversations/:id/messages` | Gửi tin nhắn outbound |

### Webhooks _(không cần JWT)_

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/integrations/zalo/webhook` | Xác thực webhook Zalo OA |
| POST | `/integrations/zalo/webhook` | Nhận tin nhắn inbound từ Zalo |
| GET | `/integrations/messenger/webhook` | Xác thực webhook Meta |
| POST | `/integrations/messenger/webhook` | Nhận tin nhắn inbound từ Messenger |

### Reporting

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/reporting/dashboard` | Counts: leads, deals, tasks, conversations |
| GET | `/reporting/sales-funnel` | Deals grouped by pipeline stage |
| GET | `/reporting/leads-by-source` | Leads phân theo nguồn / UTM |
| GET | `/reporting/activities-timeline` | Timeline hoạt động (default: 30 ngày) |
| GET | `/reporting/campaign-stats` | Thống kê tất cả chiến dịch |

---

## RBAC – Phân quyền

| Vai trò | Mô tả | Phạm vi |
|---------|-------|---------|
| `SUPER_ADMIN` | Bypass tất cả kiểm tra quyền | Toàn bộ hệ thống |
| `ADMIN` | Quản trị tổ chức | Users, RBAC, audit + tất cả CRM |
| `MANAGER` | Quản lý nhóm | CRUD leads/deals/tasks + xem reports |
| `SALES` | Nhân viên kinh doanh | Leads, contacts, deals |
| `MARKETING` | Nhân viên marketing | Leads + campaigns + templates |
| `SUPPORT` | Hỗ trợ khách hàng | Đọc CRM + conversations |
| `STAFF` | Nhân viên thông thường | Tasks của mình + đọc CRM |

**Permission pattern:** `resource:action`
_Ví dụ: `leads:create`, `deals:update`, `reports:read`, `users:invite`_

---

## Biến môi trường

> File `.env` ở root → Docker Compose đọc.
> File `apps/api/.env` → Prisma CLI + NestJS đọc khi chạy ngoài Docker.

| Biến | Mô tả | Bắt buộc |
|------|-------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Access token secret (≥ 32 ký tự) | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token secret (≥ 32 ký tự) | ✅ |
| `REDIS_URL` | Redis URL | ✅ Production |
| `ENCRYPTION_KEY` | Mã hóa channel credentials | ✅ Production |
| `FRONTEND_URL` | CORS allowed origin | ✅ Production |
| `ZALO_APP_SECRET` | Zalo OA app secret | Zalo |
| `ZALO_VERIFY_TOKEN` | Webhook verify token | Zalo |
| `META_APP_SECRET` | Facebook app secret | Messenger |
| `META_VERIFY_TOKEN` | Webhook verify token | Messenger |

---

## Tích hợp Zalo OA

1. Đăng ký OA tại [oa.zalo.me](https://oa.zalo.me) → Cài đặt → Webhook
2. Callback URL: `https://yourdomain.vn/api/integrations/zalo/webhook`
3. Điền vào `.env`:
   ```env
   ZALO_APP_SECRET=your_app_secret
   ZALO_VERIFY_TOKEN=any_custom_token
   ```
4. Tạo `ChannelAccount` trong DB:
   ```sql
   INSERT INTO channel_accounts (id, org_id, channel, name, credentials_enc, is_active)
   VALUES (gen_random_uuid(), 'your-org-id', 'ZALO', 'Zalo OA',
           '{"accessToken": "oa_access_token_here"}', true);
   ```
5. Subscribe events: `user_send_text`, `user_send_image`

---

## Tích hợp Meta Messenger

1. Tạo Facebook App tại [developers.facebook.com](https://developers.facebook.com) → Add product: Messenger
2. Webhook URL: `https://yourdomain.vn/api/integrations/messenger/webhook`
3. Điền vào `.env`:
   ```env
   META_APP_SECRET=your_app_secret
   META_VERIFY_TOKEN=any_custom_token
   ```
4. Tạo `ChannelAccount` trong DB:
   ```sql
   INSERT INTO channel_accounts (id, org_id, channel, name, credentials_enc, is_active)
   VALUES (gen_random_uuid(), 'your-org-id', 'MESSENGER', 'Facebook Page',
           '{"pageAccessToken": "page_access_token_here"}', true);
   ```
5. Subscribe: `messages`, `messaging_postbacks`

---

## Deploy Production (VPS)

### Yêu cầu VPS
- Ubuntu 22.04 LTS, tối thiểu **4 CPU / 8 GB RAM**
- Docker + Docker Compose đã cài

```bash
# 1. Clone & cấu hình
git clone <repo-url> /opt/crm && cd /opt/crm
cp .env.example .env
nano .env   # Đổi POSTGRES_PASSWORD, JWT secrets, FRONTEND_URL

# 2. Lấy SSL certificate
certbot certonly --standalone -d yourdomain.vn
mkdir -p docker/nginx/ssl
cp /etc/letsencrypt/live/yourdomain.vn/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.vn/privkey.pem docker/nginx/ssl/

# Cập nhật domain trong nginx config
sed -i 's/yourdomain.vn/your-domain.vn/g' docker/nginx/prod.conf

# 3. Build & chạy
docker compose -f docker-compose.prod.yml up -d --build

# 4. Migrate database
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# 5. Xem logs
docker compose -f docker-compose.prod.yml logs -f api web
```

### Resource limits

| Service | CPU | RAM |
|---------|-----|-----|
| api | 1.5 core | 512 MB |
| postgres | 1.0 core | 512 MB |
| redis | 0.5 core | 300 MB |
| web | 0.5 core | 256 MB |
| nginx | 0.25 core | 64 MB |

---

## CI/CD – GitHub Actions

File: `.github/workflows/ci.yml`

**Triggers:** Push/PR vào `main`, `master`, `develop`

| Job | Mô tả |
|-----|-------|
| `lint-and-build` | typecheck + lint + build tất cả apps |
| `test-api` | jest với PostgreSQL + Redis service containers |
| `deploy` | SSH deploy lên VPS _(chỉ khi push vào main)_ |

**GitHub Secrets cần thiết:**

| Secret | Mô tả |
|--------|-------|
| `VPS_HOST` | IP của VPS |
| `VPS_USER` | SSH username (thường là `ubuntu`) |
| `VPS_SSH_KEY` | Nội dung private key: `cat ~/.ssh/id_rsa` |

---

## Tech Stack

| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| Backend | NestJS + TypeScript | 10.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16 |
| Cache / Queue | Redis + BullMQ | 7.x |
| Frontend | Next.js App Router | 14.x |
| UI | Tailwind CSS + Radix UI | 3.x |
| Forms | React Hook Form + Zod | 7.x / 3.x |
| Server state | TanStack Query | v5 |
| Client state | Zustand | 4.x |
| Auth | JWT (access 15m + refresh rotation 7d) | — |
| Logging | pino + nestjs-pino | structured JSON |
| API docs | Swagger / OpenAPI | — |
| Monorepo | pnpm workspace + Turborepo | — |
| DevOps | Docker Compose + Nginx + GitHub Actions | — |

---

## Lưu ý phát triển

- **Soft delete** – Không xóa cứng. Mọi query cần `where: { deletedAt: null }`
- **Multi-tenancy** – `orgId` bắt buộc trên mọi query, dùng decorator `@OrgId()` trong controller
- **Public routes** – Dùng `@Public()` để bypass JWT guard (webhooks, login)
- **Migrations** – Dùng `pnpm db:migrate:dev --name <tên>` khi sửa `schema.prisma`
- **Seed** – An toàn khi chạy nhiều lần (dùng `upsert`), không duplicate data
- **Prisma Studio** – `pnpm db:studio` → http://localhost:5555 để xem/sửa data trực quan

---

_Cập nhật: 2026-03-21 | Phase 1–6 hoàn thành_
