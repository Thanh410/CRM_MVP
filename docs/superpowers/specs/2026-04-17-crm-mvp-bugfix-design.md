# CRM MVP Bug Fixes — Design Spec

## Context

NestJS + Next.js 14 monorepo (Turbo/pnpm). MVP CRM đang có 5 bug cần fix ưu tiên cao nhất:
1. Notifications không gửi khi gán lead
2. Notes thiếu refresh UI + xóa + auto-delete 24h
3. Lead create form thiếu field phụ trách + dropdown không hiện tên
4. Tạo deal thành công nhưng Kanban không hiện
5. Task modal không thêm được người theo dõi lúc tạo

Tiếp cận: **2 nhóm** — backend (noti + notes cleanup) và frontend (leads form + deals refresh + task watcher).

---

## PR 1: Backend Fixes

### 1a. Lead Notifications — `leads.service.ts`

**File:** `apps/api/src/modules/crm/leads/leads.service.ts`

- Inject `NotificationsService` vào `LeadsService` constructor
- Trong `assign()`: sau khi update `assignedTo`, gọi `notificationsService.create()` **chỉ khi** `assignedTo !== actorId`
- Title/body tiếng Việt: `'Bạn được gán lead mới'`, body: `"Lead \"{fullName}\" vừa được gán cho bạn."`
- Wrap trong `try/catch` — log lỗi nhưng không break flow chính
- `NotificationsModule` phải export `NotificationsService` để `LeadsModule` import được

**File:** `apps/api/src/modules/notifications/notifications.module.ts` — thêm `NotificationsService` vào exports

### 1b. Notes Auto-cleanup 24h — new file + module update

**File mới:** `apps/api/src/modules/crm/notes/notes-cleanup.service.ts`
```typescript
@Injectable()
export class NotesCleanupService {
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldNotes() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.prisma.note.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    this.logger.log(`Đã xóa ${result.count} notes quá 24 giờ.`);
  }
}
```

**File:** `apps/api/src/modules/crm/notes/notes.module.ts` — thêm `ScheduleModule.forRoot()` vào imports, thêm `NotesCleanupService` vào providers

**Check:** `package.json` có `@nestjs/schedule` chưa. Nếu chưa → `pnpm add @nestjs/schedule` trước.

### 1c. Verify Exports Chain

Đảm bảo module chain đúng:
- `NotificationsModule` exports `NotificationsService`
- `LeadsModule` imports `NotificationsModule`

---

## PR 2: Frontend Fixes

### 2a. Lead Create Form — `leads/page.tsx`

**CreateLeadModal:**
- State: thêm `assignedTo: ''`
- JSX: thêm `<select>` phụ trách sau field Nguồn, dùng `useUsers()` hook (đã tồn tại)
- Submit: thêm `assignedTo: form.assignedTo || undefined` vào payload

**LeadDetailPanel (dropdown phụ trách):**
- Thêm `onError` handler với toast tiếng Việt: `'Bạn không có quyền gán phụ trách. Vui lòng liên hệ quản lý.'`
- `onSuccess`: optimistic update `setSelectedLead` để select hiện đúng tên

### 2b. Deal Kanban Refresh — `deals/page.tsx` + `use-deals.ts`

**`CreateDealModal` trong `deals/page.tsx`:**
```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['deals'] });
  qc.invalidateQueries({ queryKey: ['deals', 'kanban'] }); // ← fix
  toast.success('Tạo deal thành công'); onClose();
},
```

**`use-deals.ts` — `useCreateDeal`, `useUpdateDealStage`, `useDeleteDeal`:**
- Thêm `qc.invalidateQueries({ queryKey: ['deals', 'kanban'] })` vào `onSuccess` cả 3 mutations

### 2c. Task Watcher — `tasks/page.tsx` CreateTaskModal

- State: thêm `watcherIds: [] as string[]`
- UI: pill/chip buttons cho mỗi user (toggle click), dùng `allUsers` query
- Submit: thêm `watcherIds: form.watcherIds.length > 0 ? form.watcherIds : undefined`

### 2d. Notes UI — `entity-timeline.tsx`

- Thêm nút xóa (icon/menu) trên mỗi note item
- Gọi `deleteNoteMutation` khi click
- Refresh list sau khi xóa

---

## Verification

1. `pnpm build` — build cả api + web không lỗi
2. `pnpm dev` — khởi động local, test từng flow:
   - Tạo lead → gán cho user B → user B thấy thông báo bell icon
   - Mở modal tạo lead → chọn phụ trách → submit → lead hiện với tên
   - Tạo deal → deal xuất hiện trên Kanban không cần F5
   - Tạo task → chọn watcher → task detail hiện đúng danh sách
   - Tạo note → click xóa → note biến mất
3. Logs terminal: `"Đã xóa X notes quá 24 giờ."` sau mỗi giờ
4. Không có console.error trong browser devtools

---

## Critical Files

| File | Action |
|------|--------|
| `apps/api/src/modules/crm/leads/leads.service.ts` | Edit — inject noti service, add create call |
| `apps/api/src/modules/notifications/notifications.module.ts` | Edit — export NotificationsService |
| `apps/api/src/modules/crm/notes/notes-cleanup.service.ts` | **New** — cron cleanup |
| `apps/api/src/modules/crm/notes/notes.module.ts` | Edit — ScheduleModule + cleanup provider |
| `apps/web/src/app/(dashboard)/crm/leads/page.tsx` | Edit — assignedTo field + error handling |
| `apps/web/src/app/(dashboard)/crm/deals/page.tsx` | Edit — invalidate kanban key |
| `apps/web/src/hooks/use-deals.ts` | Edit — invalidate kanban key on 3 mutations |
| `apps/web/src/app/(dashboard)/tasks/page.tsx` | Edit — watcherIds in CreateTaskModal |
| `apps/web/src/app/(dashboard)/crm/.../entity-timeline.tsx` | Edit — delete button |
