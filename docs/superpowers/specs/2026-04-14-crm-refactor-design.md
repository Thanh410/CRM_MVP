# CRM Refactor & Documentation - Design Spec

**Ngày:** 2026-04-14
**Mục tiêu:** Refactor toàn bộ CRM project — code, structure, documentation — để dễ scale và maintain.
**Approach:** Layer-by-layer (docs → types → backend → frontend), mỗi layer commit riêng.

---

## Nguyên tắc

- Không break production deploy (Render BE + Vercel FE)
- Không thêm dependencies mới
- Không đổi database schema
- Backward compatible — code cũ vẫn chạy sau mỗi layer
- Docs viết tiếng Việt
- Solo developer workflow

---

## Layer 1: Dọn dẹp & Documentation

### Xóa files cũ
- `DAILY_LOG_2026-03-21.md`
- `API_CHECKLIST.md`
- `AUDIT.md`
- `docs/superpowers/plans/` (toàn bộ)
- `docs/superpowers/specs/` (trừ file spec này)
- `docs/test-run-results-2026-03-26.md`

### Viết mới/viết lại

| File | Nội dung |
|---|---|
| `README.md` | Giới thiệu project, tech stack, cấu trúc thư mục, hướng dẫn cài đặt, chạy dev, deploy |
| `docs/ARCHITECTURE.md` | Kiến trúc tổng quan — monorepo, data flow, multi-tenant, RBAC, module map |
| `docs/API.md` | API endpoints theo module, auth flow, error format, pagination |
| `docs/DEPLOYMENT.md` | Deploy Render (BE) + Vercel (FE) + VPS (Docker Compose), env vars, database |
| `docs/DATABASE.md` | ER diagram text, relations, indexing strategy |
| `CHANGELOG.md` | Giữ lại, cleanup format chuẩn Keep a Changelog |

---

## Layer 2: Shared Types (`packages/types`)

### Hiện tại
- 1 file `src/index.ts` chứa 200+ dòng enums + interfaces

### Refactor
```
packages/types/src/
├── index.ts              # Re-export tất cả
├── enums.ts              # Tất cả enums
├── auth.ts               # AuthUser, LoginResponse, TokenPayload
├── organization.ts       # Organization, Department, Team
├── crm.ts                # Lead, Contact, Company, Deal, DealStage, Pipeline
├── task.ts               # Task, TaskComment, Project
├── marketing.ts          # Campaign, CampaignTemplate
├── conversation.ts       # Conversation, Message, ChannelAccount
├── common.ts             # PaginationQuery, PaginatedResult, ApiError
└── notification.ts       # Notification types
```

- `index.ts` re-export tất cả để code hiện tại không bị break

---

## Layer 3: Backend API (`apps/api`)

### 3.1 Common layer — thêm mới

```
common/
├── dto/api-response.dto.ts         # { success, data, meta, error }
├── interceptors/response.interceptor.ts  # wrap response format chuẩn
├── filters/http-exception.filter.ts      # cải thiện log + format
└── base/base-crud.service.ts             # abstract CRUD + soft delete + orgId
```

**BaseCrudService** methods:
- `findAll(orgId, query)` — pagination + soft delete filter
- `findOne(orgId, id)` — check exists + orgId
- `create(orgId, dto)`
- `update(orgId, id, dto)`
- `softDelete(orgId, id)`

### 3.2 Modules — chuẩn hóa pattern

Mỗi module theo pattern:
```
modules/[tên]/
├── [tên].controller.ts
├── [tên].service.ts       # extends BaseCrudService khi phù hợp
├── [tên].module.ts
└── dto/
    ├── create-[tên].dto.ts
    ├── update-[tên].dto.ts   # PartialType(CreateDto)
    └── query-[tên].dto.ts    # filter + pagination
```

**Modules cần bổ sung DTOs:** contacts, companies, activities, tags, notes, conversations, notifications, reporting

### 3.3 Flatten `modules/crm/`

```
# Trước: modules/crm/leads/leads.service.ts
# Sau:   modules/leads/leads.service.ts
```

Di chuyển leads, contacts, companies, deals, notes, activities, tags lên cùng cấp với các modules khác. Update imports trong app.module.ts.

---

## Layer 4: Frontend (`apps/web`)

### 4.1 Folder structure

```
src/
├── components/
│   └── shared/                  # NEW
│       ├── data-table.tsx
│       ├── confirm-dialog.tsx
│       ├── empty-state.tsx
│       └── loading-skeleton.tsx
├── hooks/                       # bổ sung thiếu
│   ├── use-contacts.ts          # NEW
│   ├── use-companies.ts         # NEW
│   └── use-projects.ts          # NEW
├── lib/
│   ├── api.ts                   # cải thiện error interceptor
│   └── constants.ts             # NEW: status labels, colors, menu items
└── types/
    └── index.ts                 # NEW: frontend-only types
```

### 4.2 Cải thiện

- `lib/api.ts` — error interceptor thống nhất (401 redirect, toast, retry)
- Pages — extract logic nặng ra hooks
- Shared components cho patterns lặp lại

### 4.3 Không đụng

- UI/UX hiện tại
- Thư viện (Radix, dnd-kit, Zustand...)
- Routing structure
