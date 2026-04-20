# CRM UI Redesign — Design Spec

**Dự án:** NestJS CRM
**Đường dẫn:** `E:\Workspace\NestJS\CRM`
**Ngày:** 2026-04-20
**Trạng thái:** Đã duyệt

---

## Tổng quan

Nâng cấp UX cho 3 phần chính: **Sidebar dropdown**, **Settings page**, và **RBAC pipeline visualization**. Không thay đổi logic nghiệp vụ, chỉ cải thiện giao diện và trải nghiệm người dùng.

---

## Phần 1 — Sidebar với Dropdown Hover + Collapsible

### Mục tiêu
Sidebar hiện tại là flat list 11 mục. Nâng cấp lên có dropdown menu khi hover, hiện sub-danh mục và action nhanh, có thể collapse để tiết kiệm không gian.

### Thiết kế

**File:** `apps/web/src/components/layout/sidebar.tsx`

#### Trạng thái Expanded (w-64)
- Sidebar giữ nguyên w-64
- Mỗi nav item có icon + label
- Items có sub-menu hiện `▾` indicator

#### Trạng thái Collapsed (w-16)
- Toggle button ở logo section
- Chỉ hiện icon, hover hiện tooltip
- Dropdown vẫn hoạt động bình thường

#### Dropdown Menu Behavior
```
Trigger: hover 150ms (debounce để tránh flicker)
Open: absolute positioned panel, w-56, xuất hiện bên phải sidebar
Close: hover ra ngoài → delay 200ms → close
Switch: hover sang dropdown khác → close cũ → open mới
```

#### Sub-danh mục cho mỗi nav item

| Nav Item | Sub-items |
|----------|-----------|
| Khách hàng tiềm năng | Tất cả · NEW (Tiềm năng) · CONTACTED (Đã liên hệ) · QUALIFIED (Đủ điều kiện) · UNQUALIFIED · **[+ Thêm mới]** |
| Liên hệ | Tất cả · VIP · Mới tuần này · **[+ Thêm]** |
| Công ty | Tất cả · Partner · Khách hàng · **[+ Thêm]** |
| Cơ hội | Tất cả · Đang mở · Đã thắng · Đã thua · **[+ Thêm deal]** |
| Dự án | Tất cả · Đang chạy · Hoàn thành · **[+ Thêm]** |
| Nhiệm vụ | Tất cả · Cần làm · Đang làm · Đang xem xét · Hoàn thành |
| Marketing | Tất cả · Chiến dịch · Automation · **[+ Chiến dịch]** |
| Hộp thư | Hộp thư đến · Đã gửi |
| Nhân sự | Tất cả người dùng · Invite người mới |
| Nhật ký | Audit log |
| Cài đặt | Hồ sơ · Phân quyền · Tích hợp |

#### UI Components cần tạo

```typescript
// SubNavDropdown component
interface DropdownItem {
  label: string;
  href: string;
  badge?: string; // e.g. count
  isAction?: boolean; // + button style
}

interface NavDropdownProps {
  items: DropdownItem[];
  children: React.ReactNode; // trigger button
}
```

#### Collapse Toggle
- Thêm state `isCollapsed` (localStorage persistence)
- Icon button `ChevronLeft/ChevronRight` trong logo section
- `w-64` ↔ `w-16` transition với CSS class `transition-all duration-200`
- Khi collapsed: `hidden` label, icon centered

#### Active State
- Dùng `usePathname()` như hiện tại
- Nếu `isCollapsed`: highlight icon với dot indicator thay vì bg color

---

## Phần 2 — Settings Page Redesign

### Mục tiêu
Thiết kế lại page Settings đẹp hơn theo chuẩn UX/UI: cleaner layout, icon-driven navigation, improved visual hierarchy.

### Thiết kế

**File:** `apps/web/src/app/(dashboard)/settings/page.tsx`

#### Layout Structure
```
┌──────────────────────────────────────────────────────────────────┐
│  Page Header: "Cài đặt" + breadcrumb                            │
│  Subtitle: "Quản lý tổ chức, phân quyền và tích hợp"          │
├───────────────────┬──────────────────────────────────────────────┤
│  Tab Sidebar      │  Content Area                               │
│  (w-56)           │  (flex-1)                                   │
│                   │                                              │
│  🏢 Tổ chức      │  [Tab content here]                         │
│  🌿 Phòng ban     │                                              │
│  👥 Nhóm          │                                              │
│  🛡️ Phân quyền    │                                              │
│  🏷️ Tags          │                                              │
│  🔌 Tích hợp      │                                              │
└───────────────────┴──────────────────────────────────────────────┘
```

#### Thay đổi so với hiện tại
- **Từ horizontal tabs** → **Vertical tab sidebar** (bên trái)
- Tab items: icon + label, vertical list
- Active tab: indigo left border `border-l-2 border-indigo-500`
- Content area: clean card with rounded-xl, shadow-sm
- Header của mỗi section: icon + title + description

#### Sections cần thiết kế lại

**DeptsTab (Phòng ban)**
- Tree view với expand/collapse (dùng `ChevronDown` thay vì `ChevronRight` luôn mở)
- Hover row: hiện edit/delete actions
- Drag-drop reorder (stretch goal)
- Visual depth: `pl-${depth * 6}` với `border-l-2 border-gray-100`

**TeamsTab (Nhóm)**
- Card grid thay vì list
- Mỗi card: team name, dept, member count, description preview
- Quick action: assign role, invite member

**TagsTab**
- Masonry layout hoặc wrapping flex
- Tag chip với color swatch
- Inline rename

**IntegrationsTab**
- Card-based layout với integration logo
- Status indicator (connected/disconnected)
- Action buttons: Configure, Disconnect, Test

---

## Phần 3 — RBAC Pipeline Visualization

### Mục tiêu
Phần RBAC hiện tại chỉ là checklist. Bổ sung **pipeline visualization** giúp admin hiểu role của từng bộ phận một cách trực quan.

### Thiết kế

**File:** `apps/web/src/app/(dashboard)/settings/page.tsx` (RbacTab)

#### Two-panel Layout

```
┌─────────────────────┬──────────────────────────────────────────────────┐
│  ROLE SELECTOR      │  PERMISSION PIPELINE VIEW                        │
│  (w-56)             │  (flex-1)                                       │
│                     │                                                  │
│  ● SUPER_ADMIN      │  SUPER_ADMIN ──────────────────────────────────►│
│  ○ ADMIN            │    ✓ leads:create                               │
│  ● MANAGER          │    ✓ leads:read                                  │
│  ○ SALES      ←─────│    ✓ leads:update                                │
│  ○ MARKETING        │    ✓ leads:delete                                │
│  ○ SUPPORT          │    ✓ leads:assign                                │
│  ○ STAFF            │    ✓ leads:export                                │
│                     │    ... all permissions ON                         │
│  ─────────────────  │                                                  │
│  + Tạo vai trò mới │  ─────────────────────────────────────────────   │
│                     │                                                  │
│                     │  SALES ROLE                                       │
│                     │  ─────────────────────────────────────────────   │
│                     │                                                  │
│                     │  leads:create  ████████████████████████  ✓      │
│                     │  leads:read    ████████████████████████  ✓      │
│                     │  leads:update  ████████████████████████  ✓      │
│                     │  leads:delete  █████████████░░░░░░░░░░  ⚠️      │
│                     │  leads:assign  █████████████░░░░░░░░░░  ⚠️      │
│                     │  leads:export  ░░░░░░░░░░░░░░░░░░░░░░  ✗       │
│                     │  contacts:all  ████████████████████████  ✓      │
│                     │  deals:all     ████████████░░░░░░░░░░░  ⚠️      │
│                     │  tasks:assign  █████████████░░░░░░░░░░░  ⚠️      │
│                     │  reports:read  ████████████░░░░░░░░░░░░  ⚠️      │
│                     │                                                  │
│                     │  [💾 Lưu thay đổi]   [↺ Hoàn tác]               │
└─────────────────────┴──────────────────────────────────────────────────┘
```

#### Permission Bar Component
```
Mỗi permission row:
[resource:action] [████████████░░░░░░░░░░░░░] [badge]

Bar = filled% = (width based on permission level)
Badge:
  ✓ = full permission (all data)
  ⚠️ = scoped (own data only)
  ✗ = no permission
  ? = inherited from parent role
```

#### Pipeline Flow
```
Khi chọn 1 role → hiện full pipeline view
  - Resource headers: leads · contacts · companies · deals · tasks · projects · campaigns · conversations · reports · audit
  - Each resource collapsible
  - Bar chart inline với filled segments

Visual encoding:
  Full bar (100%): ██████████ = can do everything
  Partial bar (50%): █████░░░░ = scoped to own data only
  Empty bar (0%): ░░░░░░░░░ = no permission
```

#### Thông tin bổ sung
- Header: "SALES" role — "Nhân viên kinh doanh" (displayName)
- Subtitle: "12 người dùng" (user count từ API)
- Hover permission row → tooltip: "Cho phép SALES tạo lead mới, tự động gán cho người tạo"

#### Interactions
- Click permission bar → toggle ON/OFF
- Drag bar fill → fine-tune scoped percentage (stretch)
- `pendingPerms` Set tracking → Save button enabled only when dirty
- Hoàn tác: reset về last saved state

---

## Implementation Order

1. **Sidebar dropdown** — Tạo `SubNavDropdown` component + update `sidebar.tsx`
2. **Sidebar collapse toggle** — Thêm state + localStorage persistence
3. **Settings page layout** — Chuyển horizontal tabs → vertical sidebar tabs
4. **RbacTab pipeline view** — Thêm `PermissionBar` component + pipeline layout

---

## Files cần sửa

| File | Phần |
|------|------|
| `apps/web/src/components/layout/sidebar.tsx` | 1, 2 |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | 2, 3 |
| `apps/web/src/components/layout/sub-nav-dropdown.tsx` | **Mới** — 1 |

---

## Verification

1. `pnpm build` — cả api + web không lỗi
2. Mở `http://localhost:3001/settings` — kiểm tra tab layout mới
3. Mở sidebar — hover các nav items → dropdown hiện sub-items
4. Click collapse toggle → sidebar thu gọn, icon vẫn hiện
5. Vào Settings → Phân quyền → chọn từng role → pipeline hiện đúng permission bars
6. `pnpm dev` — test dev mode không có console.error
