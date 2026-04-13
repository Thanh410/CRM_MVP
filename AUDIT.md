# CRM Project Audit Report
**Ngày:** 2026-04-04
**Scope:** 139 backend endpoints × 14 frontend pages

---

## 1. BACKEND APIs — Cross-reference với Frontend

### ✅ APIs đang được gọi đầy đủ (135/139)

| Module | Backend | Frontend gọi | Status |
|--------|---------|--------------|--------|
| Auth | 6 | 6 | ✅ Đầy đủ |
| Users | 6 | 6 | ✅ Đầy đủ |
| Organizations | 9 | 9 | ✅ Đầy đủ |
| RBAC | 5 | 5 | ✅ Đầy đủ |
| Leads | 9 | 9 | ✅ Đầy đủ |
| Contacts | 5 | 5 | ✅ Đầy đủ |
| Companies | 5 | 5 | ✅ Đầy đủ |
| Deals | 10 | 10 | ✅ Đầy đủ |
| Notes | 4 | 4 | ✅ Đầy đủ |
| Activities | 3 | 3 | ✅ Đầy đủ |
| Tags | 6 | 6 (hooks có, Settings dùng) | ⚠️ Xem mục 2 |
| Tasks | 10 | 10 | ✅ Đầy đủ |
| Projects | 5 | 5 | ✅ Đầy đủ |
| Marketing | 13 | 13 | ✅ Đầy đủ |
| Conversations | 6 | 6 | ✅ Đầy đủ |
| Notifications | 4 | 4 | ✅ Đầy đủ |
| Reporting | 5 | 5 | ✅ Đầy đủ |
| Audit | 1 | 1 | ✅ Đầy đủ |

---

### ❌ APIs KHÔNG được gọi từ Frontend (4/139)

Đây là **webhook server-to-server** — Facebook và Zalo gọi thẳng vào backend, không qua frontend. Về mặt kỹ thuật là **đúng thiết kế**, nhưng **không có UI để cấu hình channel**.

| Endpoint | Lý do không gọi từ FE | Vấn đề thực sự |
|----------|----------------------|----------------|
| `GET /api/integrations/messenger/webhook` | FB verify webhook | ❌ Không có UI nhập App ID/Secret |
| `POST /api/integrations/messenger/webhook` | FB gửi message | ❌ Không có UI nhập App ID/Secret |
| `GET /api/integrations/zalo/webhook` | Zalo verify webhook | ❌ Không có UI nhập Zalo OA ID |
| `POST /api/integrations/zalo/webhook` | Zalo gửi message | ❌ Không có UI nhập Zalo OA ID |

**Vấn đề:** Settings page hoàn toàn không có tab "Tích hợp kênh" để cấu hình Zalo OA / Facebook Page. Người dùng phải sửa thẳng `.env` — không dùng được trên production.

---

## 2. FRONTEND — Tính năng có hooks nhưng THIẾU UI

### Tags gắn vào entity (Lead/Contact/Company)

Hooks **đã có** trong `use-tags.ts`:
- `useAddTagToEntity` → `POST /tags/:id/entities`
- `useRemoveTagFromEntity` → `DELETE /tags/:id/entities/:entityType/:entityId`
- `useEntityTags` → `GET /tags/entity/:entityType/:entityId`

**Vấn đề:** Không có component nào gọi các hooks này. Người dùng:
- Có thể tạo tags trong Settings ✅
- **KHÔNG thể gắn/gỡ tag vào từng lead, contact, company** ❌

**Ảnh hưởng:** Tính năng audience filter trong Marketing (lọc theo tag) không hoạt động được nếu không gắn tag vào lead.

---

## 3. FRONTEND — Đánh giá từng trang (Production Readiness)

### 🟢 Hoạt động tốt — Production Ready

| Trang | Tính năng đã có | Ghi chú |
|-------|----------------|---------|
| **Login** | Form login, forgot/reset password, demo account hint | ✅ |
| **Dashboard** | 5 reporting charts, funnel, leads by source, timeline, campaign stats | ✅ |
| **Users** | CRUD users, assign/remove roles, deactivate, slide-over detail | ✅ |
| **Settings** | Org info, Departments CRUD, Teams CRUD, RBAC permission editor, Tags CRUD | ✅ |
| **Audit** | Bảng audit log, filter, pagination | ✅ |
| **Marketing** | Templates CRUD, Campaigns CRUD, launch/pause, audience preview, summary stats | ✅ |
| **Projects** | CRUD projects, slide-over detail, assign departments | ✅ |

---

### 🟡 Hoạt động được nhưng còn thiếu

#### Leads (`/leads`)
| Tính năng | Status | Vấn đề |
|-----------|--------|--------|
| Danh sách, filter, search | ✅ | |
| Tạo lead | ✅ | |
| Sửa / Xóa lead | ✅ | |
| Assign lead cho user | ✅ | Dropdown trong detail panel |
| Convert lead → Contact | ✅ | Nút trong row |
| Export CSV | ✅ | |
| Import CSV | ✅ | |
| **Gắn tag vào lead** | ❌ | Hooks có, không có UI |
| **Phân trang (pagination)** | ❌ | Chỉ load 1 trang, không có next/prev |

#### Contacts (`/contacts`)
| Tính năng | Status | Vấn đề |
|-----------|--------|--------|
| CRUD contacts | ✅ | |
| Liên kết company | ✅ | Dropdown khi tạo/sửa |
| Detail panel + Timeline | ✅ | |
| **Gắn tag vào contact** | ❌ | Hooks có, không có UI |
| **Phân trang** | ❌ | |

#### Companies (`/companies`)
| Tính năng | Status | Vấn đề |
|-----------|--------|--------|
| CRUD companies | ✅ | |
| Detail panel + Timeline | ✅ | |
| **Gắn tag vào company** | ❌ | Hooks có, không có UI |
| **Phân trang** | ❌ | |

#### Deals (`/deals`)
| Tính năng | Status | Vấn đề |
|-----------|--------|--------|
| Kanban board | ✅ | |
| Drag & drop giữa cột | ✅ | |
| Tạo / Sửa / Xóa deal | ✅ | |
| Move stage nhanh | ✅ | |
| Mark Won / Lost | ✅ | |
| Pipeline selector | ✅ | |
| List view toggle | ✅ | |
| **Timeline/Notes trên deal** | ❌ | EntityTimeline không được dùng trong deals page |
| **Liên kết contact/company** | ❌ | Khi tạo deal không chọn được contact |
| **Phân trang (list view)** | ❌ | |

#### Tasks (`/tasks`)
| Tính năng | Status | Vấn đề |
|-----------|--------|--------|
| Kanban board | ✅ | |
| Drag & drop | ✅ | |
| CRUD tasks | ✅ | |
| Move status | ✅ | |
| List view toggle | ✅ | |
| Assign users, set project | ✅ | |
| Add/remove watchers | ✅ | |
| **Comments trên task** | ❌ | `useAddTaskComment` hook có, không có UI comment box trong task detail |
| **Task detail đầy đủ** | ⚠️ | Slide-over chỉ show thông tin, không có comment thread |

#### Inbox (`/inbox`)
| Tính năng | Status | Vấn đề |
|-----------|--------|--------|
| Danh sách conversations | ✅ | |
| Chat window, send message | ✅ | |
| Assign agent | ✅ | |
| Link contact | ✅ | |
| Đóng/mở conversation | ✅ | |
| **Cấu hình kênh Zalo/FB** | ❌ | Không có UI — phải sửa .env |
| **Tạo conversation thủ công** | ❌ | Chỉ nhận incoming, không tạo được từ UI |

---

## 4. TÓM TẮT — Mức độ ưu tiên sửa

### 🔴 Critical (ảnh hưởng core workflow)

| # | Vấn đề | File cần sửa |
|---|--------|-------------|
| 1 | **Gắn tag vào Leads/Contacts/Companies** — Marketing audience filter không hoạt động nếu không có tag trên entities | leads, contacts, companies page |
| 2 | **Comments trên Task** — `useAddTaskComment` có nhưng không có UI | tasks/page.tsx |
| 3 | **Timeline/Notes trên Deal** — EntityTimeline không được dùng trong deals | deals/page.tsx |

### 🟠 Medium (thiếu tính năng quan trọng)

| # | Vấn đề | File cần sửa |
|---|--------|-------------|
| 4 | **Phân trang** cho Leads, Contacts, Companies, Deals (list view) | Tất cả list pages |
| 5 | **Liên kết Contact/Company khi tạo Deal** | deals/page.tsx CreateDealModal |
| 6 | **Tab "Tích hợp kênh"** trong Settings (Zalo OA, FB Messenger config) | settings/page.tsx |

### 🟡 Low (nice to have)

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| 7 | Tạo conversation thủ công từ Inbox | Outbound messaging |
| 8 | Filter nâng cao trên Audit log (date range, user filter) | Hiện chỉ có search text |
| 9 | Bulk actions trên leads (assign nhiều, xóa nhiều) | |

---

## 5. Kết luận

- **139/139 endpoints đã có trong code** — 4 webhook endpoints không cần gọi từ FE (đúng)
- **Tất cả 135 endpoints còn lại đều được gọi từ frontend** ✅
- **Vấn đề chính không phải thiếu API** mà là **thiếu UI** để dùng các hook đã có (tags, comments, timeline trên deal)
- **Production blocker quan trọng nhất:** Tags gắn vào entity + Comment trên task + Phân trang
