# Changelog - CRM Kanban & UX Improvements

## Ngày cập nhật: 2026-03-28

### Tổng quan

Nâng cấp toàn diện hệ thống Kanban board cho cả **Deals** và **Tasks**, bổ sung Drag-and-Drop, chế độ xem danh sách, và nhiều tính năng quản lý mới.

---

## 1. Drag-and-Drop (Kéo thả thẻ giữa các cột)

**Thư viện:** `@dnd-kit/core` v6.3.1, `@dnd-kit/sortable`, `@dnd-kit/utilities`

### Deals Kanban
- Thêm `DndContext`, `DragOverlay`, `PointerSensor` (kích hoạt sau 8px di chuyển)
- Mỗi cột giai đoạn (`StageColumn`) là một **droppable zone** — highlight viền indigo khi hover
- Mỗi thẻ deal (`DraggableDealCard`) là **draggable** — nắm toàn bộ thẻ để kéo (không cần grip handle)
- Khi thả thẻ vào cột khác → tự động gọi `PUT /deals/:id/move-stage` cập nhật giai đoạn
- Thẻ đang kéo hiện overlay rút gọn (tên + giá trị), thẻ gốc giảm opacity 30%
- Deal đã thắng/thua (`WON`/`LOST`) không cho phép kéo

### Tasks Kanban
- Cùng pattern: `TaskStatusColumn` (droppable) + `DraggableTaskCard` (draggable)
- Kéo task giữa các cột TODO → IN_PROGRESS → REVIEW → DONE
- Overlay hiển thị tên task + badge ưu tiên
- Nắm toàn bộ thẻ để kéo (cursor `grab`/`grabbing`)

**Files thay đổi:**
- `apps/web/package.json` — thêm 3 dependencies `@dnd-kit/*`
- `apps/web/src/app/(dashboard)/deals/page.tsx`
- `apps/web/src/app/(dashboard)/tasks/page.tsx`

---

## 2. Nút di chuyển giai đoạn (Stage Move Buttons)

### Deals
- Mỗi thẻ deal OPEN hiển thị danh sách nút ở cuối thẻ → click để chuyển nhanh sang giai đoạn khác
- Format: `▶ Tên giai đoạn` — border nhỏ, hover highlight indigo
- Ẩn khi deal đã WON/LOST

### Tasks
- Đã có sẵn trong TaskCard với 4 nút trạng thái (TODO, IN_PROGRESS, REVIEW, DONE)

**File:** `apps/web/src/app/(dashboard)/deals/page.tsx`

---

## 3. Pipeline Selector (Bộ chọn pipeline)

- Thêm dropdown "Tất cả pipeline" ở header trang Deals
- Gọi `usePipelines()` hook lấy danh sách pipeline
- Chỉ hiển thị khi có > 1 pipeline
- Thay đổi pipeline → `useDealsKanban(pipelineId)` tự động re-fetch

**File:** `apps/web/src/app/(dashboard)/deals/page.tsx`

---

## 4. Xóa Deal

### Hook mới
```typescript
// apps/web/src/hooks/use-deals.ts
export function useDeleteDeal() {
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${id}`),
    onSuccess: () => invalidate + toast success,
    onError: () => toast error,
  });
}
```

### UI
- Nút 🗑 (Trash2) xuất hiện khi hover thẻ deal (cả Kanban và List view)
- Click → hiện modal xác nhận "Xóa deal?" với tên deal
- Nút "Hủy" / "Xóa deal" (đỏ, có loading state)
- Sau khi xóa: đóng modal, bỏ chọn nếu deal đang được select

**Files:**
- `apps/web/src/hooks/use-deals.ts`
- `apps/web/src/app/(dashboard)/deals/page.tsx`

---

## 5. Chuyển đổi Kanban / Danh sách (View Mode Toggle)

### Deals
- Toggle button group: `LayoutGrid` (Kanban) | `List` (Danh sách)
- **Kanban view:** Board kéo thả như mô tả ở trên
- **List view:** Bảng với các cột:
  | Deal | Giá trị | Giai đoạn | Trạng thái | Xác suất | Phụ trách |
  - Click row → mở detail panel
  - Hover → hiện nút Edit + Delete
  - Giai đoạn hiện dot màu + tên
  - Trạng thái: badge Mở/Thắng/Thua

### Tasks
- Cùng toggle button group
- **Kanban view:** Board kéo thả
- **List view:** Bảng với các cột:
  | Nhiệm vụ | Trạng thái | Ưu tiên | Người thực hiện | Dự án | Hạn chót |
  - Click row → mở detail slide-over
  - Badge màu cho trạng thái và ưu tiên
  - Ngày format `vi-VN`

**Files:**
- `apps/web/src/app/(dashboard)/deals/page.tsx`
- `apps/web/src/app/(dashboard)/tasks/page.tsx`

---

## 6. UX cải thiện

| Trước | Sau |
|-------|-----|
| Kéo thả chỉ bằng icon ⠿ nhỏ | Nắm toàn bộ thẻ để kéo (cursor grab) |
| Không có cách xóa deal từ UI | Nút xóa + modal xác nhận |
| Không chuyển giai đoạn nhanh | Nút di chuyển ở cuối mỗi thẻ |
| Chỉ có 1 pipeline cố định | Dropdown chọn pipeline |
| Chỉ có view Kanban | Toggle Kanban ↔ Danh sách |
| Cột không highlight khi kéo thả | Viền indigo + nền sáng khi hover |
| Không có overlay khi kéo | Ghost card hiện tên + giá trị/ưu tiên |

---

## Tóm tắt files thay đổi

| File | Thay đổi |
|------|----------|
| `apps/web/package.json` | +3 deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| `apps/web/src/hooks/use-deals.ts` | +`useDeleteDeal` hook |
| `apps/web/src/app/(dashboard)/deals/page.tsx` | DnD, stage move, pipeline selector, delete, list view, whole-card drag |
| `apps/web/src/app/(dashboard)/tasks/page.tsx` | DnD, list view, whole-card drag, fix `projectId` TS error |
| `pnpm-lock.yaml` | Lock file updated |

**Tổng:** +420 dòng thêm, -33 dòng xóa (5 files)
