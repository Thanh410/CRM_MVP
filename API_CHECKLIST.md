# CRM API Checklist

> Kiểm tra toàn bộ API mà frontend sử dụng. Tested: 2026-03-21
> Base URL: `http://localhost:3000/api`
> Auth: Bearer token từ `POST /auth/login`
> Test account: `superadmin@abc.com.vn` / `Admin@123456`

---

## Bugs đã sửa trong quá trình test

| # | Vấn đề | Trạng thái |
|---|--------|-----------|
| 1 | Prisma schema có 15 lỗi validation do polymorphic FK relations sai (Note, Activity, EntityTag, Attachment, CustomFieldValue) | ✅ Fixed – xóa FK relations, giữ `entityType + entityId` |
| 2 | DB còn FK constraints cũ (`note_lead_fk`, `act_lead_fk`, v.v.) → POST /notes trả 500 | ✅ Fixed – `DROP CONSTRAINT` trực tiếp trên DB |
| 3 | TypeScript: `tags` include bị xóa khỏi Lead/Contact/Company/Deal include | ✅ Fixed |
| 4 | `Contact` model không có field `avatar` – service dùng sai | ✅ Fixed |
| 5 | `conversations.service.ts` dùng `assignedToId` thay vì `assignedTo` | ✅ Fixed |
| 6 | `projects.service.ts`: `department` → `dept`, import `@nestjs/mapped-types` → `@nestjs/swagger` | ✅ Fixed |
| 7 | `CreateCampaignDto` thiếu field `description` → `POST /marketing/campaigns` trả 400 | ✅ Fixed |

---

## 1. Authentication

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| POST | `/auth/login` | ✅ 200 | Trả `accessToken` + `refreshToken` |
| GET | `/auth/me` | ✅ 200 | Trả user info + roles |
| POST | `/auth/refresh` | ✅ 200 | Đổi refresh token mới |
| POST | `/auth/logout` | ✅ 200 | Revoke refresh token |

---

## 2. Leads

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/leads` | ✅ 200 | Có pagination, filter `status`, `source`, `search`, `assignedTo` |
| GET | `/leads/:id` | ✅ 200 | Trả lead detail + assignee |
| POST | `/leads` | ✅ 201 | Tạo mới lead |
| PATCH | `/leads/:id` | ✅ 200 | Cập nhật lead |
| DELETE | `/leads/:id` | ✅ 204 | Soft delete |
| POST | `/leads/:id/convert` | ✅ 201 | Convert lead → contact (tạo Contact mới) |
| PATCH | `/leads/:id/assign` | ✅ 200 | Assign lead cho user |
| GET | `/leads/export/csv` | ✅ 200 | CSV có BOM UTF-8, format đúng |

---

## 3. Contacts

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/contacts` | ✅ 200 | Pagination, filter `search`, `companyId` |
| GET | `/contacts/:id` | ✅ 200 | Chi tiết contact + company + deals |
| POST | `/contacts` | ✅ 201 | Tạo contact mới |
| PATCH | `/contacts/:id` | ✅ 200 | Cập nhật |
| DELETE | `/contacts/:id` | ✅ 204 | Soft delete |

---

## 4. Companies

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/companies` | ✅ 200 | Pagination, filter `search` |
| GET | `/companies/:id` | ✅ 200 | Chi tiết + contacts + deals |
| POST | `/companies` | ✅ 201 | Tạo mới |
| PATCH | `/companies/:id` | ✅ 200 | Cập nhật |
| DELETE | `/companies/:id` | ✅ 204 | Soft delete |

---

## 5. Deals

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/deals` | ✅ 200 | Pagination, filter `stageId`, `ownerId`, `status` |
| GET | `/deals/kanban` | ✅ 200 | Grouped by stage với `totalValue` |
| GET | `/deals/:id` | ✅ 200 | Chi tiết + stage + pipeline + contact + company |
| POST | `/deals` | ✅ 201 | Tạo deal mới |
| PATCH | `/deals/:id` | ✅ 200 | Cập nhật |
| PATCH | `/deals/:id/stage` | ✅ 200 | Di chuyển stage |
| PATCH | `/deals/:id/won` | ✅ 200 | Đánh dấu thắng (`status: CLOSED_WON`) |
| PATCH | `/deals/:id/lost` | ✅ 200 | Đánh dấu thua + `lostReason` |
| DELETE | `/deals/:id` | ✅ 204 | Soft delete |

**Lưu ý:** Frontend `use-deals.ts` dùng `PATCH` cho won/lost, không phải `POST`.

---

## 6. Notes (Polymorphic)

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/notes?entityType=LEAD&entityId=:id` | ✅ 200 | Filter theo entity |
| POST | `/notes` | ✅ 201 | Body: `{entityType, entityId, content, isPinned?}` |
| PATCH | `/notes/:id` | ✅ 200 | Cập nhật content / isPinned |
| DELETE | `/notes/:id` | ✅ 204 | Soft delete |

**entityType values:** `LEAD`, `CONTACT`, `COMPANY`, `DEAL`, `TASK`

---

## 7. Activities (Polymorphic)

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/activities?entityType=LEAD&entityId=:id` | ✅ 200 | Filter theo entity |
| POST | `/activities` | ✅ 201 | Body: `{entityType, entityId, type, title, description?}` |
| DELETE | `/activities/:id` | ✅ 204 | Soft delete |

**type values:** `CALL`, `EMAIL`, `MEETING`, `NOTE`, `TASK`, `OTHER`

---

## 8. Tags

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/tags` | ✅ 200 | Danh sách tags + `_count.entities` |
| POST | `/tags` | ✅ 201 | Tạo tag (upsert nếu trùng tên) |
| PATCH | `/tags/:id` | ✅ 200 | Đổi tên/màu |
| DELETE | `/tags/:id` | ✅ 204 | Xóa tag |
| POST | `/tags/:id/entities` | ✅ 201 | Gán tag cho entity: `{entityType, entityId}` |
| DELETE | `/tags/:id/entities/:entityType/:entityId` | ✅ 204 | Bỏ gán tag |

---

## 9. Projects

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/projects` | ✅ 200 | Danh sách projects + task count |
| GET | `/projects/:id` | ✅ 200 | Chi tiết + dept + owner |
| POST | `/projects` | ✅ 201 | Tạo project mới |
| PATCH | `/projects/:id` | ✅ 200 | Cập nhật |
| DELETE | `/projects/:id` | ✅ 204 | Soft delete |

---

## 10. Tasks

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/tasks` | ✅ 200 | Filter: `projectId`, `assigneeId`, `status`, `mine=true` |
| GET | `/tasks/kanban` | ✅ 200 | 4 columns: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE` |
| GET | `/tasks/:id` | ✅ 200 | Chi tiết + comments + watchers |
| POST | `/tasks` | ✅ 201 | Tạo task mới |
| PATCH | `/tasks/:id` | ✅ 200 | Cập nhật |
| PATCH | `/tasks/:id/status` | ✅ 200 | Đổi status |
| POST | `/tasks/:id/comments` | ✅ 201 | Thêm comment |
| DELETE | `/tasks/:id` | ✅ 204 | Soft delete |

**Lưu ý:** Route `/tasks/kanban` phải khai báo trước `/:id` trong controller.

---

## 11. Marketing

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/marketing/templates` | ✅ 200 | Danh sách templates |
| POST | `/marketing/templates` | ✅ 201 | Tạo template: `{name, channel, subject?, body}` |
| PATCH | `/marketing/templates/:id` | ✅ 200 | Cập nhật |
| DELETE | `/marketing/templates/:id` | ✅ 204 | Xóa |
| GET | `/marketing/campaigns` | ✅ 200 | Filter `status`, `channel` |
| GET | `/marketing/campaigns/:id` | ✅ 200 | Chi tiết campaign |
| POST | `/marketing/campaigns` | ✅ 201 | Tạo campaign: `{name, channel, templateId?, description?}` |
| PATCH | `/marketing/campaigns/:id` | ✅ 200 | Cập nhật |
| POST | `/marketing/campaigns/:id/launch` | ✅ 200 | Status → `ACTIVE` |
| POST | `/marketing/campaigns/:id/pause` | ✅ 200 | Status → `PAUSED` |
| GET | `/marketing/campaigns/:id/summary` | ✅ 200 | Thống kê `sentCount`, `openCount`, logs |
| GET | `/marketing/audience-preview` | ✅ 200 | Preview số contact theo filter |

**channel values:** `EMAIL`, `SMS`, `ZALO`, `MESSENGER`

---

## 12. Conversations (Inbox)

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/conversations` | ✅ 200 | Filter `status=OPEN/PENDING/CLOSED` |
| GET | `/conversations/:id` | ✅ 200 | Chi tiết + messages + participants |
| PATCH | `/conversations/:id/assign` | ✅ 200 | Assign cho agent |
| PATCH | `/conversations/:id/status` | ✅ 200 | Đổi status |
| PATCH | `/conversations/:id/link` | ✅ 200 | Link với `contactId` / `leadId` |
| POST | `/conversations/:id/messages` | ✅ 201 | Agent gửi tin nhắn |

**Lưu ý:** Conversation được tạo tự động khi webhook từ Zalo/Messenger nhận tin nhắn inbound.

---

## 13. Reporting

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/reporting/dashboard` | ✅ 200 | Leads by status, Deals by stage, Tasks open, Conversations open |
| GET | `/reporting/sales-funnel` | ✅ 200 | Count + totalValue per pipeline stage |
| GET | `/reporting/leads-by-source` | ✅ 200 | Group by `source` |
| GET | `/reporting/activities-timeline` | ✅ 200 | Activities grouped by date |
| GET | `/reporting/campaign-stats` | ✅ 200 | Campaign performance summary |

---

## 14. Notifications

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/notifications` | ✅ 200 | Danh sách + `unreadCount` |
| PATCH | `/notifications/:id/read` | ✅ 200 | Đánh dấu đã đọc |
| PATCH | `/notifications/read-all` | ✅ 200 | Đánh dấu tất cả đã đọc |
| DELETE | `/notifications/:id` | ✅ 204 | Xóa notification |

---

## 15. Users & RBAC

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/users` | ✅ 200 | Danh sách users trong org |
| GET | `/users/:id` | ✅ 200 | Chi tiết user |
| POST | `/users/invite` | ✅ 201 | Mời user mới |
| PATCH | `/users/:id` | ✅ 200 | Cập nhật profile |
| PATCH | `/users/:id/status` | ✅ 200 | ACTIVE / INACTIVE |
| GET | `/rbac/roles` | ✅ 200 | Danh sách roles |
| GET | `/rbac/permissions` | ✅ 200 | Danh sách permissions |
| POST | `/rbac/roles/:id/permissions` | ✅ 200 | Gán permission cho role |

---

## 16. Webhooks (Không cần auth)

| Method | Endpoint | Status | Ghi chú |
|--------|----------|--------|---------|
| GET | `/integrations/zalo/webhook` | ✅ 200 | Verify webhook (Zalo OA) |
| POST | `/integrations/zalo/webhook` | ✅ 200 | Receive inbound message |
| GET | `/integrations/messenger/webhook` | ✅ 200 | Verify webhook (Meta) |
| POST | `/integrations/messenger/webhook` | ✅ 200 | Receive inbound message |

---

## Tóm tắt

| Module | Endpoints | Status |
|--------|-----------|--------|
| Auth | 4 | ✅ |
| Leads | 8 | ✅ |
| Contacts | 5 | ✅ |
| Companies | 5 | ✅ |
| Deals | 9 | ✅ |
| Notes | 4 | ✅ |
| Activities | 3 | ✅ |
| Tags | 6 | ✅ |
| Projects | 5 | ✅ |
| Tasks | 8 | ✅ |
| Marketing | 12 | ✅ |
| Conversations | 6 | ✅ |
| Reporting | 5 | ✅ |
| Notifications | 4 | ✅ |
| Users & RBAC | 8 | ✅ |
| Webhooks | 4 | ✅ |
| **Total** | **96** | **✅ All pass** |

---

## Cách chạy lại test nhanh

```bash
cd E:/Workspace/NestJS/CRM

# 1. Start infra
docker compose up -d postgres redis minio

# 2. Start API
cd apps/api
cp ../../.env .env
pnpm dev

# 3. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@abc.com.vn","password":"Admin@123456"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# 4. Test một endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/leads
```
