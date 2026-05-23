# CRM Vietnam — UI Documentation

> Tài liệu giao diện hiện tại của CRM. Mọi screenshot trong `screenshots/` được sinh tự động bởi `scripts/capture-ui-screenshots.ts`.

**Stack:** Next.js 14 (App Router) · React 18 · Tailwind CSS 3.4 · Radix UI · recharts · cmdk · vaul · react-day-picker · next-themes · @dnd-kit · sonner · lucide-react

---

## Mục lục

1. [Cách chụp ảnh screenshots](#cách-chụp-ảnh-screenshots)
2. [Design System](#design-system)
3. [Layout chính](#layout-chính)
4. [Trang Authentication](#trang-authentication)
5. [Dashboard](#dashboard)
6. [Leads](#leads)
7. [Contacts & Companies](#contacts--companies)
8. [Deals (Kanban)](#deals-kanban)
9. [Tasks](#tasks)
10. [Marketing](#marketing)
11. [Inbox](#inbox)
12. [Settings — RBAC Matrix](#settings--rbac-matrix)
13. [Users & Audit](#users--audit)
14. [Command Palette & Shortcuts](#command-palette--shortcuts)
15. [Mobile responsive](#mobile-responsive)
16. [Components catalog](#components-catalog)

---

## Cách chụp ảnh screenshots

```bash
# 1. Đảm bảo stack đang chạy
docker compose up -d
pnpm dev   # web port 3001, api port 3000

# 2. Cài Playwright
pnpm add -D -w playwright
npx playwright install chromium

# 3. Chạy script
pnpm tsx scripts/capture-ui-screenshots.ts
```

Script sẽ tự đăng nhập demo account (`superadmin@abc.com.vn` / `Admin@123456`), điều hướng qua tất cả pages, chụp full-page + retina 2x, lưu vào `docs/ui/screenshots/`.

---

## Design System

### Color palette (Linear/Vercel style)

| Token | Light | Dark | Dùng cho |
|---|---|---|---|
| `background` | `0 0% 100%` (white) | `240 10% 4%` | Body |
| `foreground` | `240 10% 3.9%` | `0 0% 95%` | Text chính |
| `card` | `0 0% 100%` | `240 10% 7%` | Card bg |
| `border` | `240 5.9% 90%` (zinc-200) | `240 4% 18%` (zinc-800) | Viền |
| `primary` | `240 5.9% 10%` (zinc-900) | `0 0% 95%` | Button chính |
| `muted` | `240 4.8% 95.9%` | `240 4% 14%` | Bg phụ |
| `accent` | Pastel HSL seeded từ ID | — | Avatars |

**Sidebar luôn dark** `bg-[#0f0f0f]` (không đổi theo theme — đặc trưng Linear).

### Typography

| Element | Class |
|---|---|
| Page title (`h1`) | `text-xl font-semibold tracking-tight text-zinc-900` |
| Section header (`h2`) | `text-sm font-semibold text-zinc-900` |
| Body | `text-sm text-zinc-700` |
| Secondary | `text-xs text-zinc-500` |
| Hint/label uppercase | `text-[10px]/[11px] font-medium uppercase tracking-wider text-zinc-400` |

Font: **Inter** (Google Fonts, subsets latin + vietnamese).

### Spacing (8pt grid)

- Card padding: `p-5` (20px)
- Section gap: `gap-6` (24px)
- Form fields: `space-y-4` (16px)
- Table row height: `py-3` (12px top+bottom) → ~44px tổng

### Border radius

| Element | Radius |
|---|---|
| Input/Button nhỏ | `rounded-md` (6px) |
| Button thường | `rounded-lg` (8px) |
| Card | `rounded-xl` (12px) |
| Modal | `rounded-2xl` (16px) |
| Avatar/Badge | `rounded-full` |

### Shadow

| Use | Class |
|---|---|
| Card | `shadow-sm` (rất nhẹ) |
| Hover deal card | `shadow-md` |
| Modal | `shadow-2xl` |
| Dropdown | `shadow-xl` |

### Focus ring (đã thống nhất Sprint 4)

```css
button:focus-visible,
a:focus-visible {
  outline: none;
  ring: 2px solid hsl(zinc-900);
  ring-offset: 2px solid white;
}
```

---

## Layout chính

![Layout](./ui/screenshots/10-dashboard-light.png)

```
┌────────────┬───────────────────────────────────────────────┐
│            │ Header (h-14, white/zinc-950)                  │
│            │ ┌─────────┐                  ┌───┐ ┌─┐ ┌──┐  │
│  Sidebar   │ │ 🔍 ⌘K   │                  │☀️ │ │🔔│ │👤│  │
│  (w-56,    │ └─────────┘                  └───┘ └─┘ └──┘  │
│   #0f0f0f) ├───────────────────────────────────────────────┤
│            │                                                │
│  • Tổng    │                                                │
│    quan    │                                                │
│  ▾ CRM     │    Main content area                          │
│  ▾ Công    │    (p-6, bg-zinc-50/50 hoặc dark:zinc-900)   │
│    việc    │                                                │
│  ▾ Kết nối │                                                │
│  ▾ Quản lý │                                                │
│            │                                                │
│  ─────     │                                                │
│  ⚙ Cài đặt │                                                │
│  ⏏ Đăng    │                                                │
│   xuất     │                                                │
│            │                                                │
│  ┌─────┐   │                                                │
│  │User │   │                                                │
│  └─────┘   │                                                │
└────────────┴───────────────────────────────────────────────┘
```

**Sidebar nav groups** (hover để expand):
- **CRM**: Leads, Contacts, Companies, Deals
- **Công việc**: Projects, Tasks
- **Kết nối**: Marketing, Inbox
- **Quản lý**: Users, Audit

---

## Trang Authentication

### Login (light + dark)

![Login light](./ui/screenshots/01-login-light.png)
![Login dark](./ui/screenshots/02-login-dark.png)

**Đặc điểm:**
- Background `bg-zinc-950` (full dark), card trắng `rounded-2xl shadow-2xl`
- Logo "C" trên card, label "CRM Vietnam"
- Form validation `mode='onBlur'`: error xuất hiện ngay khi user rời field
- Show/hide password toggle (icon Eye/EyeOff)
- Remember me checkbox → quyết định localStorage vs sessionStorage
- Link "Quên mật khẩu?" góc phải

```tsx
const { register, formState: { errors, touchedFields } } = useForm({
  resolver: zodResolver(loginSchema),
  mode: 'onBlur',
  reValidateMode: 'onChange',
});
```

---

## Dashboard

![Dashboard light](./ui/screenshots/10-dashboard-light.png)
![Dashboard dark](./ui/screenshots/11-dashboard-dark.png)

### 4 Stat Cards (top row)

```
┌──────────────────────────┐ ┌──────────────────────────┐
│ 👥                ╱╲╱╲   │ │ 📈                ╱╲╱╲   │
│                          │ │                          │
│ 1,234  ↑ 12%            │ │ 856   ↑ 8%              │
│                          │ │                          │
│ Khách hàng tiềm năng    │ │ Cơ hội đang mở          │
└──────────────────────────┘ └──────────────────────────┘
```

Mỗi card có:
- Icon (Lucide) màu zinc-400
- **Sparkline** mini chart (recharts `LineChart`) — 7 ngày gần nhất
- Số lớn `text-3xl font-bold`, format `vi-VN` (1.234)
- **Delta badge** xanh ↑ hoặc đỏ ↓ với phần trăm thay đổi
- Label phía dưới `text-sm text-zinc-500`

### Charts (recharts)

| Chart | Type | File |
|---|---|---|
| Phễu bán hàng | Custom bar (theo stage) | dashboard/page.tsx |
| Lead theo nguồn | `BarChart` horizontal | line 110-130 |
| Trạng thái Lead | `PieChart` (innerRadius=50, outerRadius=75) | line ~165 |
| Hoạt động 7 ngày | Stacked `BarChart` | line ~210 |
| Thống kê chiến dịch | Bars div | line ~250 |

---

## Leads

### Danh sách

![Leads list](./ui/screenshots/20-leads-list.png)

**Table columns:**
| ☐ | Họ tên ↕ | Liên hệ | Trạng thái ↕ | Nguồn | Phụ trách | Ngày tạo ↕ | ⋯ |
|---|---|---|---|---|---|---|---|

**Tính năng:**
- ☐ Checkbox column cho **bulk select** — tristate (all/some/none)
- Avatar mỗi lead có **màu HSL seeded** từ ID (FNV-1a hash)
- Headers `Họ tên`, `Trạng thái`, `Ngày tạo` clickable → **sort asc/desc** với arrow icon
- Filter bar trên: search input + status select + refresh
- Pagination cuối: "1-20 / 35" + Trước/Sau

### Bulk action bar

![Leads bulk](./ui/screenshots/21-leads-bulk-actions.png)

```
┌────────────────────────────────────────────────────────────┐
│ ●● 2 đã chọn   [Bỏ chọn]              [🗑 Xóa đã chọn]    │  ← bg-zinc-900
├────────────────────────────────────────────────────────────┤
│ ✓ │ Nguyễn Văn A │ ...   │  ← bg-indigo-50/50
│ ✓ │ Trần Thị B   │ ...   │
└────────────────────────────────────────────────────────────┘
```

### Empty state

![Leads empty](./ui/screenshots/23-leads-empty.png)

```
┌─────────────────────────────────────────────┐
│                                              │
│              ┌────────┐                     │
│              │   👥   │                     │
│              └────────┘                     │
│                                              │
│         Chưa có lead nào                    │
│         Bắt đầu bằng cách thêm lead         │
│         mới hoặc import từ file CSV.        │
│                                              │
│         • Tạo thủ công với họ tên...        │
│         • Hoặc import hàng loạt từ CSV      │
│         • Hoặc tự động từ form FB/Zalo      │
│                                              │
│         [+ Thêm lead]  [⬆ Import CSV]      │
│                                              │
└─────────────────────────────────────────────┘
```

### Create modal

![Leads create](./ui/screenshots/22-leads-create-modal.png)

Form fields: Họ tên\* (required), Email, SĐT, Trạng thái (select), Nguồn (select), Phụ trách (select user), Ghi chú (textarea).

Footer: `[Hủy]` `[Tạo lead]`

### Detail panel (desktop) + Drawer (mobile)

Click 1 lead → side panel slide-in bên phải (desktop) hoặc **vaul drawer** slide-up từ dưới (mobile).

Panel content:
- Avatar + tên + status badge
- Contact info (📧 email, 📞 phone, 🔗 source)
- Phụ trách dropdown (inline change)
- TagSelector
- **EntityTimeline** — notes + activities mixed timeline

---

## Contacts & Companies

![Contacts](./ui/screenshots/30-contacts-list.png)
![Companies](./ui/screenshots/40-companies-list.png)

Tương tự Leads:
- Skeleton loading, empty state với hints
- Avatar seeded color
- Slide-over detail panel với tabs (Info / Tags / Deals / Notes)
- Inline edit modal cho create/update

---

## Deals (Kanban)

![Deals kanban](./ui/screenshots/50-deals-kanban.png)

### Filter pills

```
Lọc: [Tất cả][Quá hạn][Tuần này][Tháng này]  [Phụ trách: ▾]  [✕ Xóa lọc]
                                                  Hiển thị 23 cơ hội · 4.5 tỷ
```

### Column header (Sprint 1 enhancement)

```
┌──────────────────────────┐
│ ● Negotiation         5  │  ← stage color dot + name + count badge
│   1.2 tỷ · TB 240tr/deal │  ← compact value + average per deal
│                          │
│ ┌──────────────────────┐ │  ← deal card (white, shadow-sm)
│ │ Hợp đồng phần mềm    │ │
│ │ 250.000.000 ₫        │ │
│ │ 👤 Nguyễn Văn A      │ │
│ │ 📅 15/05/2026        │ │
│ └──────────────────────┘ │
│                          │
│ [Drag-and-drop area]     │
└──────────────────────────┘
```

### Drag-and-drop (dnd-kit)

- Pointer sensor với `activationConstraint: { distance: 8 }`
- `DragOverlay` hiển thị card while dragging
- Drop → call `PATCH /deals/:id/stage`

### Deal modal

Edit fields: Tên\*, Giá trị, Tiền tệ, Xác suất %, Ngày chốt (`DatePicker` react-day-picker với locale VI), Ghi chú.

Win/Lost flow:
- Click 🏆 → mark won (status WON, optional `wonAt`)
- Click 👎 → modal với lý do thua → mark lost

---

## Tasks

![Tasks kanban](./ui/screenshots/60-tasks-kanban.png)

4 columns: **Cần làm** · **Đang làm** · **Đang xem xét** · **Hoàn thành**

Mỗi task card:
- Title + description
- Priority badge (Thấp/Trung bình/Cao/Khẩn cấp) màu zinc/blue/orange/red
- Avatar assignee
- Due date (📅 format vi-VN)
- Comment count badge

Task detail modal có:
- Title editable
- Description (textarea)
- Status / Priority / Assignee / Project / Due date
- Watchers list + Add watcher
- Comment thread (avatar + body + relative timestamp)
- EntityTimeline

---

## Marketing

![Marketing](./ui/screenshots/70-marketing-campaigns.png)

Tabs: **Chiến dịch** / **Templates**

Campaign card:
- Channel icon: 📧 Email · 📱 SMS · 🟦 Zalo · 💬 Messenger · 🔔 Nội bộ
- Status badge: Bản nháp / Đang chạy / Tạm dừng / Hoàn thành
- Metrics: sent / opened / clicked / bounced
- Actions: Launch / Pause / View summary

Campaign Summary modal có chart bar metrics + log status table với row colors theo state.

---

## Inbox

![Inbox](./ui/screenshots/80-inbox.png)

3-column layout:
```
┌──────────┬──────────────┬──────────────┐
│ Conv     │ Messages     │ Contact info │
│ list     │ thread       │ + assign     │
│          │              │              │
│ Filter:  │ ┌───────┐    │ Avatar       │
│ Open/    │ │ User  │←   │ Name         │
│ Closed   │ └───────┘    │ Email        │
│          │              │ Phone        │
│ List     │     →┌────┐  │              │
│ with     │      │Agent│  │ Linked       │
│ avatars  │      └────┘  │ contact/lead │
└──────────┴──────────────┴──────────────┘
```

---

## Settings — RBAC Matrix

![Settings RBAC](./ui/screenshots/91-settings-rbac.png)

### Tabs

`Tổ chức` · `Phòng ban` · `Nhóm` · **Phân quyền** · `Tags` · `Tích hợp kênh`

### Phân quyền (RBAC matrix view — đã redesign)

```
┌─────────────┬──────────────────────────────────────────────────────────┐
│   Vai trò   │  ADMIN — 43/43 quyền     [Bỏ tất cả] [Hủy] [Lưu]         │
│             │  🔍 Tìm tài nguyên...                                     │
│ ┌─────────┐ │  ┌──────────────┬─────┬─────┬─────┬─────┬─────┬─────┐   │
│ │ SUPER 43│ │  │ TÀI NGUYÊN   │ TẠO │ XEM │ SỬA │ XÓA │ GIAO │ TỔNG│   │
│ │ ADMIN 43│ │  │              │ ◐3/5│ ☑5/5│ ☑5/5│ ☐0/5│ ◐2/4│     │   │
│ │ MANAGER │ │  ├──────────────┼─────┼─────┼─────┼─────┼─────┼─────┤   │
│ │      18 │ │  │ ☑ Leads      │  ☑  │  ☑  │  ☑  │  ☐  │  ☑  │ 4/5 │   │
│ │ SALES 12│ │  │   leads      │     │     │     │     │     │     │   │
│ │ ...     │ │  ├──────────────┼─────┼─────┼─────┼─────┼─────┼─────┤   │
│ └─────────┘ │  │ ◐ Liên hệ    │  ☑  │  ☑  │  ☐  │  ☐  │  —  │ 2/4 │   │
│             │  │   contacts   │     │     │     │     │     │     │   │
└─────────────┴─────────────────────────────────────────────────────────┘
```

**Tương tác:**
- **Click header cột** (vd "TẠO") → toggle tất cả permissions của action đó
- **Click tên resource** (vd "Liên hệ") → toggle tất cả permissions của resource đó
- **Click cell checkbox** → toggle 1 permission đơn lẻ
- **Button "Chọn tất cả/Bỏ tất cả"** ở header phải
- **Tristate icon**: ☐ (none) / ◐ (some) / ☑ (all)
- **Cell "—"** = permission đó không tồn tại cho cặp (resource, action)
- **Counter** mỗi hàng/cột với màu: xám (none) / indigo (some) / emerald (all)

**Action labels tiếng Việt:** Tạo · Xem · Sửa · Xóa · Giao · Xuất · Trả lời · Quản lý

---

## Users & Audit

### Users

![Users](./ui/screenshots/A0-users.png)

Table: Avatar + Name + Email + Department + Team + Roles + Status (Hoạt động / Vô hiệu / Đã mời) + Last login + Actions (Edit / Deactivate / Delete).

User modal: form đầy đủ với role select (single role hiện tại), gender, jobTitle, dept/team cascade.

### Audit

![Audit](./ui/screenshots/B0-audit.png)

Filter bar: Search + Resource select + User select + Date range.

Table columns: Action badge (Tạo/Cập nhật/Xóa/Đăng nhập...) + Resource + ResourceId + User + IP + Created at.

Click row → expand `ChangesViewer` (JSON diff viewer).

---

## Command Palette & Shortcuts

### Command Palette (Cmd+K)

![Command palette](./ui/screenshots/C0-command-palette.png)

```
┌────────────────────────────────────────────────┐
│ 🔍 Tìm kiếm lead, liên hệ, công ty...    [ESC] │
├────────────────────────────────────────────────┤
│ TRANG                                          │
│ 📊 Tổng quan                                  │
│ 👥 Khách hàng tiềm năng                       │
│ 👥 Liên hệ                                    │
│ 🏢 Công ty                                    │
│ 💼 Cơ hội kinh doanh                          │
│                                                │
│ LEADS                                          │
│ 👤 Nguyễn Văn A — email@x.vn                  │
│ 👤 Trần Thị B   — email@y.vn                  │
│                                                │
│ LIÊN HỆ                                        │
│ 👤 Phạm Văn C — ABC Company                   │
├────────────────────────────────────────────────┤
│ ↑↓ điều hướng   ↵ chọn   ESC đóng             │
└────────────────────────────────────────────────┘
```

Powered by `cmdk` library. Search backend: parallel queries `/leads`, `/contacts`, `/companies` với 5 results mỗi loại.

### Keyboard shortcuts modal (?)

![Shortcuts](./ui/screenshots/C1-keyboard-shortcuts.png)

| Phím | Action | Group |
|---|---|---|
| `g d` | Đi tới Tổng quan | Điều hướng |
| `g l` | Đi tới Khách hàng tiềm năng | Điều hướng |
| `g c` | Đi tới Liên hệ | Điều hướng |
| `g o` | Đi tới Công ty | Điều hướng |
| `g e` | Đi tới Cơ hội | Điều hướng |
| `g t` | Đi tới Nhiệm vụ | Điều hướng |
| `g i` | Đi tới Hộp thư | Điều hướng |
| `g s` | Đi tới Cài đặt | Điều hướng |
| `c` | Tạo mới (theo trang) | Hành động |
| `/` | Focus thanh tìm kiếm | Hành động |
| `⌘ K` | Mở Command Palette | Hành động |
| `?` | Hiện danh sách phím tắt | Hệ thống |
| `Esc` | Đóng modal/drawer | Hệ thống |

Implementation: `keyboard-shortcuts.tsx` với key buffer 1.5s timeout cho sequences.

---

## Mobile responsive

![Leads mobile](./ui/screenshots/M0-leads-mobile.png)
![Dashboard mobile](./ui/screenshots/M1-dashboard-mobile.png)

- Sidebar → hamburger menu (cần implement)
- Table → giữ horizontal scroll
- Detail panel → **vaul drawer** slide-up 92vh thay panel cạnh table
- Stat cards: 1 column trên `< sm`, 2 columns `sm-lg`, 4 columns `lg+`
- Modals: full-width với padding 16px

---

## Components catalog

### UI primitives (`src/components/ui/`)

| Component | File | Mục đích |
|---|---|---|
| `Skeleton` | `skeleton.tsx` | Loading placeholder Tailwind animate-pulse |
| `TableSkeleton` | `skeleton.tsx` | N rows × M cols pre-built |
| `CardSkeleton` | `skeleton.tsx` | Stat card skeleton |
| `KanbanSkeleton` | `skeleton.tsx` | Kanban columns + cards |
| `EmptyState` | `empty-state.tsx` | Icon + title + hints + 2 CTAs |
| `ResponsivePanel` | `responsive-panel.tsx` | Desktop inline + mobile vaul drawer |
| `DatePicker` | `date-picker.tsx` | react-day-picker + Radix Popover, locale vi |
| `CommandPalette` | `command-palette.tsx` | cmdk-powered Cmd+K search |
| `KeyboardShortcutsProvider` | `keyboard-shortcuts.tsx` | Global key handler + help modal |
| `ThemeToggle` | `theme-toggle.tsx` | Sun/Moon toggle next-themes |

### Domain components

| Component | File | Mục đích |
|---|---|---|
| `Sidebar` | `layout/sidebar.tsx` | Dark sidebar với dropdown nav groups |
| `Header` | `layout/header.tsx` | Search trigger + notifications + avatar |
| `EntityTimeline` | `entity-timeline.tsx` | Notes + activities mixed timeline |
| `TagSelector` | `tag-selector.tsx` | Tag picker với create-on-the-fly |

### Utilities (`src/lib/`)

| Util | File | Mục đích |
|---|---|---|
| `cn` | `utils.ts` | clsx + tailwind-merge |
| `formatCurrency` | `utils.ts` | Intl.NumberFormat vi-VN VND |
| `formatCompactVND` | `utils.ts` | "1.2 tỷ" / "250 tr" / "15K" |
| `formatDate` | `utils.ts` | DD/MM/YYYY mặc định, custom format |
| `getInitials` | `utils.ts` | Last 2 initials, uppercase |
| `getAvatarColor` | `avatar-color.ts` | HSL seeded từ ID (FNV-1a) |
| `avatarStyle` | `avatar-color.ts` | Inline style helper |

### Hooks (`src/hooks/`)

| Hook | File | Endpoint |
|---|---|---|
| `useLeads` | `use-leads.ts` | GET /leads |
| `useCreateLead`, `useDeleteLead`, `useConvertLead`, `useAssignLead` | ↑ | mutations |
| `useDeals*` | `use-deals.ts` | /deals, /deals/kanban |
| `useTasks*` | `use-tasks.ts` | /tasks, /tasks/kanban |
| `useNotifications`, `useMarkRead`, `useMarkAllRead` | `use-notifications.ts` | /notifications |
| `usePermissions` | `use-permissions.ts` | derived from auth.store |

### State (`src/store/`)

| Store | File | State |
|---|---|---|
| `useAuthStore` | `auth.store.ts` | user, accessToken, refreshToken, isAuthenticated, hasPermission, hasRole |

---

## Đã làm vs Chưa làm

### ✅ Đã hoàn thành (commits gần nhất)

- Linear/Vercel-style redesign toàn bộ pages
- Recharts cho dashboard
- DatePicker tiếng Việt
- Command palette + keyboard shortcuts
- Dark mode (next-themes)
- Skeleton loaders 4 variants
- EmptyState component
- Avatar seeded colors
- Mobile vaul drawer (chỉ Leads)
- Sortable + bulk actions (chỉ Leads)
- RBAC matrix view với "chọn tất cả"
- Dashboard sparklines + delta indicators
- Login form real-time validation
- Focus rings + transitions consistency

### 🟡 Một phần (Sprint 1-4 chỉ áp dụng Leads/Deals/Dashboard làm reference)

- Skeleton/EmptyState chưa áp dụng đầy đủ cho: Companies, Users, Audit, Projects, Marketing, Inbox
- Avatar seeded chưa áp dụng cho: Sidebar user card, Users table, Inbox conversation list
- Bulk actions + sort headers chưa có ở: Contacts, Companies, Users, Audit
- Vaul mobile drawer chưa wire: Contacts, Deals, Tasks

### ⏳ Chưa làm (backlog)

- Hamburger menu cho sidebar trên mobile
- WIP limit indicator trên kanban columns
- Quick-add card inline cho kanban
- Density toggle (Comfortable/Compact/Cozy) cho tables
- Column visibility toggle
- Inline edit cells (click cell → popover select)
- Auto-save draft cho forms
- Phone input mask
- Activity feed panel trên dashboard
- Typing indicator + read receipts cho Inbox

---

## Tham khảo

- [Linear UI](https://linear.app) — inspiration chính
- [Vercel Dashboard](https://vercel.com/dashboard) — inspiration sidebar + cards
- [shadcn/ui](https://ui.shadcn.com) — Radix component patterns
- [Tailwind UI](https://tailwindui.com) — empty states, forms

---

_Generated theo state CRM tại branch `main` commit `e650128`._
