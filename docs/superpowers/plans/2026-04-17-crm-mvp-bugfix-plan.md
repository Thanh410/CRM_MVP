# CRM MVP Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 bugs in the CRM MVP: lead notifications, notes auto-cleanup, lead assignee field, deal kanban refresh, and task watcher modal.

**Architecture:** 2-PR approach — PR 1 for backend (notifications + notes cleanup), PR 2 for frontend (lead form + deal refresh + task watcher + notes delete).

**Tech Stack:** NestJS, Prisma, Next.js, React Query, @nestjs/schedule, Sonner toast, Radix UI.

---

## File Map

| File | Action |
|------|--------|
| `apps/api/src/modules/crm/leads/leads.service.ts` | Modify — inject NotificationsService, add notify call in assign() |
| `apps/api/src/modules/notifications/notifications.module.ts` | Modify — export NotificationsService |
| `apps/api/src/modules/crm/notes/notes-cleanup.service.ts` | Create — new cron service |
| `apps/api/src/modules/crm/notes/notes.module.ts` | Modify — add ScheduleModule + cleanup provider |
| `apps/api/src/modules/crm/leads/leads.module.ts` | Modify — import NotificationsModule |
| `apps/web/src/app/(dashboard)/crm/leads/page.tsx` | Modify — assignedTo field in CreateLeadModal + error handling |
| `apps/web/src/app/(dashboard)/crm/deals/page.tsx` | Modify — invalidate kanban key in CreateDealModal |
| `apps/web/src/hooks/use-deals.ts` | Modify — invalidate kanban key on useCreateDeal/useUpdateDealStage/useDeleteDeal |
| `apps/web/src/app/(dashboard)/tasks/page.tsx` | Modify — watcherIds in CreateTaskModal |
| `apps/web/src/components/crm/entity-timeline.tsx` | Modify — add delete button per note |

---

## PR 1: Backend Fixes

### Task 1: Inject NotificationsService into LeadsService

**Files:**
- Modify: `apps/api/src/modules/notifications/notifications.module.ts`
- Modify: `apps/api/src/modules/crm/leads/leads.module.ts`
- Modify: `apps/api/src/modules/crm/leads/leads.service.ts`

---

- [ ] **Step 1: Read NotificationsModule and add NotificationsService to exports**

Read `apps/api/src/modules/notifications/notifications.module.ts`.

If `NotificationsService` is NOT already in the `exports` array, add it:

```typescript
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // add this line if missing
})
export class NotificationsModule {}
```

---

- [ ] **Step 2: Read LeadsModule and import NotificationsModule**

Read `apps/api/src/modules/crm/leads/leads.module.ts`.

If `NotificationsModule` is NOT already imported, update the module:

```typescript
@Module({
  imports: [PrismaModule, NotificationsModule], // add NotificationsModule here
  controllers: [LeadsController],
  providers: [LeadsService, LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
```

---

- [ ] **Step 3: Add NotificationsService to LeadsService constructor**

Read `apps/api/src/modules/crm/leads/leads.service.ts`. Add import and update constructor:

```typescript
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private notificationsService: NotificationsService, // add this line
  ) {}
```

---

- [ ] **Step 4: Add notification call inside assign() method**

Read the `assign()` method in `leads.service.ts`. It should be around line 107. After `prisma.lead.update()` and before `return lead`, add notification logic:

```typescript
async assign(orgId: string, id: string, assignedTo: string, actorId?: string) {
  await this.findOneSimple(orgId, id);
  const user = await this.prisma.user.findFirst({ where: { id: assignedTo, orgId } });
  if (!user) throw new BadRequestException('Assignee not found in organization');

  const lead = await this.prisma.lead.update({
    where: { id },
    data: { assignedTo, updatedBy: actorId },
    select: LEAD_SELECT,
  });

  // Send notification only if assigning to a different user
  if (assignedTo !== actorId) {
    try {
      const leadData = await this.prisma.lead.findFirst({
        where: { id },
        select: { fullName: true },
      });
      await this.notificationsService.create({
        orgId,
        userId: assignedTo,
        type: 'LEAD_ASSIGNED',
        title: 'Bạn được gán lead mới',
        body: `Lead "${leadData?.fullName}" vừa được gán cho bạn.`,
        entityType: 'LEAD',
        entityId: id,
      });
    } catch (err) {
      this.logger.error('Failed to send lead assignment notification', err);
    }
  }

  return lead;
}
```

---

- [ ] **Step 5: Verify backend build**

Run: `cd apps/api && pnpm build`
Expected: PASS with no TypeScript errors

---

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/notifications/notifications.module.ts apps/api/src/modules/crm/leads/leads.module.ts apps/api/src/modules/crm/leads/leads.service.ts
git commit -m "fix: wire lead assignment notifications

- Export NotificationsService from NotificationsModule
- Import NotificationsModule in LeadsModule
- Inject NotificationsService in LeadsService
- Send LEAD_ASSIGNED notification when assigning to another user
- Wrap in try/catch to avoid breaking assign flow

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Notes Auto-cleanup 24h

**Files:**
- Check: `apps/api/package.json` — confirm @nestjs/schedule installed
- Create: `apps/api/src/modules/crm/notes/notes-cleanup.service.ts`
- Modify: `apps/api/src/modules/crm/notes/notes.module.ts`

---

- [ ] **Step 1: Check if @nestjs/schedule is installed**

Run: `grep "@nestjs/schedule" apps/api/package.json`
Expected: line with `"@nestjs/schedule": "^x.x.x"`

If not found, run: `cd apps/api && pnpm add @nestjs/schedule`

---

- [ ] **Step 2: Create notes-cleanup.service.ts**

Create file `apps/api/src/modules/crm/notes/notes-cleanup.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotesCleanupService {
  private readonly logger = new Logger(NotesCleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldNotes() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.prisma.note.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`Đã xóa ${result.count} notes quá 24 giờ.`);
    }
  }
}
```

---

- [ ] **Step 3: Update notes.module.ts**

Read `apps/api/src/modules/crm/notes/notes.module.ts`. Update it:

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { NotesCleanupService } from './notes-cleanup.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotesController],
  providers: [NotesService, NotesCleanupService],
  exports: [NotesService],
})
export class NotesModule {}
```

---

- [ ] **Step 4: Verify build**

Run: `cd apps/api && pnpm build`
Expected: PASS

---

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/crm/notes/notes-cleanup.service.ts apps/api/src/modules/crm/notes/notes.module.ts
git commit -m "feat: add notes auto-cleanup after 24 hours

- New NotesCleanupService with @Cron(EVERY_HOUR)
- Hard-deletes notes where createdAt < (now - 24h)
- Registers in NotesModule with ScheduleModule.forRoot()

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## PR 2: Frontend Fixes

### Task 3: Lead Assignee in CreateLeadModal + Error Handling

**Files:**
- Modify: `apps/web/src/app/(dashboard)/crm/leads/page.tsx`

---

- [ ] **Step 1: Read the file and identify key sections**

Read `apps/web/src/app/(dashboard)/crm/leads/page.tsx`. Identify:
- The `useState` for form (around line 21)
- The `useUsers()` hook location
- The CreateLeadModal JSX
- The submit handler
- The assign dropdown in the detail panel

---

- [ ] **Step 2: Ensure useUsers() is at file level**

Check if `useUsers()` is at file level (outside any component). If it is inside another component, move it outside so CreateLeadModal can use it. If already at file level, skip this step.

---

- [ ] **Step 3: Add assignedTo to form state**

In the form `useState`, add `assignedTo: ''`:

```typescript
const [form, setForm] = useState({
  fullName: '', email: '', phone: '',
  status: 'NEW', source: '', notes: '',
  assignedTo: '', // add this line
});
```

---

- [ ] **Step 4: Add Phụ trách select in CreateLeadModal JSX**

After the source select field in the modal, add:

```tsx
<div>
  <label className={labelCls}>Phụ trách</label>
  <select
    className={inputCls}
    value={form.assignedTo}
    onChange={set('assignedTo')}
  >
    <option value="">-- Chưa gán --</option>
    {(users ?? []).map((u: any) => (
      <option key={u.id} value={u.id}>{u.fullName}</option>
    ))}
  </select>
</div>
```

---

- [ ] **Step 5: Add assignedTo to createLead payload**

In `createLead.mutate()`, add `assignedTo` to the payload:

```typescript
createLead.mutate(
  {
    ...form,
    email: form.email || undefined,
    phone: form.phone || undefined,
    source: form.source || undefined,
    notes: form.notes || undefined,
    assignedTo: form.assignedTo || undefined, // add this line
  },
  { onSuccess: onClose },
);
```

---

- [ ] **Step 6: Add onError handler in detail panel assign dropdown**

Find `assignLead.mutate()` in the detail panel. Add `onError` handler:

```typescript
onError: () => {
  toast.error('Bạn không có quyền gán phụ trách. Vui lòng liên hệ quản lý.');
},
```

Confirm `onSuccess` updates `selectedLead.assignee` with response data for optimistic UI.

---

- [ ] **Step 7: Verify build**

Run: `cd apps/web && pnpm build`
Expected: PASS with no errors

---

- [ ] **Step 8: Commit**

```bash
git add "apps/web/src/app/(dashboard)/crm/leads/page.tsx"
git commit -m "fix: add assignedTo field to lead create modal and error handling

- Add Phụ trách dropdown using useUsers() hook
- Pass assignedTo in createLead mutation payload
- Add Vietnamese error toast when assign permission denied

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Deal Kanban Refresh Fix

**Files:**
- Modify: `apps/web/src/app/(dashboard)/crm/deals/page.tsx`
- Modify: `apps/web/src/hooks/use-deals.ts`

---

- [ ] **Step 1: Read deals/page.tsx and use-deals.ts**

Read `apps/web/src/app/(dashboard)/crm/deals/page.tsx` — find the `useMutation` in `CreateDealModal` (around line 158).
Read `apps/web/src/hooks/use-deals.ts` — find `useCreateDeal`, `useUpdateDealStage`, `useDeleteDeal`.

---

- [ ] **Step 2: Fix CreateDealModal in deals/page.tsx**

In `CreateDealModal`'s `useMutation`, add cascade invalidation:

```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['deals'] });
  qc.invalidateQueries({ queryKey: ['deals', 'kanban'] }); // add this line
  toast.success('Tạo deal thành công'); onClose();
},
```

---

- [ ] **Step 3: Fix useCreateDeal in use-deals.ts**

Find `useCreateDeal`. Update its `onSuccess`:

```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['deals'] });
  qc.invalidateQueries({ queryKey: ['deals', 'kanban'] }); // add this line
  toast.success('Tạo deal thành công');
},
```

---

- [ ] **Step 4: Fix useUpdateDealStage in use-deals.ts**

Find `useUpdateDealStage`. Update `onSuccess`:

```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['deals'] });
  qc.invalidateQueries({ queryKey: ['deals', 'kanban'] }); // add this line
},
```

---

- [ ] **Step 5: Fix useDeleteDeal in use-deals.ts**

Find `useDeleteDeal`. Update `onSuccess`:

```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['deals'] });
  qc.invalidateQueries({ queryKey: ['deals', 'kanban'] }); // add this line
},
```

---

- [ ] **Step 6: Verify build**

Run: `cd apps/web && pnpm build`
Expected: PASS

---

- [ ] **Step 7: Commit**

```bash
git add "apps/web/src/app/(dashboard)/crm/deals/page.tsx" apps/web/src/hooks/use-deals.ts
git commit -m "fix: invalidate kanban query key after deal mutations

- CreateDealModal: invalidate ['deals','kanban'] on success
- useCreateDeal: same fix
- useUpdateDealStage: same fix
- useDeleteDeal: same fix

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Task Watcher in CreateTaskModal

**Files:**
- Modify: `apps/web/src/app/(dashboard)/tasks/page.tsx`

---

- [ ] **Step 1: Read CreateTaskModal section**

Read `apps/web/src/app/(dashboard)/tasks/page.tsx`. Identify:
- The `CreateTaskModal` function/component
- Where `allUsers` is fetched
- The form state
- The submit handler

---

- [ ] **Step 2: Make allUsers accessible in CreateTaskModal**

If `allUsers` is inside `TaskDetailSlideOver` and not accessible to `CreateTaskModal`, move the `useUsers()` hook to file level. Or add `const { data: allUsers } = useUsers()` inside `CreateTaskModal`.

---

- [ ] **Step 3: Add watcherIds to form state**

In `CreateTaskModal`'s form state, add:

```typescript
watcherIds: [] as string[],
```

---

- [ ] **Step 4: Add Người theo dõi chip UI**

In `CreateTaskModal` JSX, before the submit button, add:

```tsx
<div>
  <label className={labelCls}>Người theo dõi</label>
  <div className="flex flex-wrap gap-2">
    {(allUsers ?? []).map((u: any) => {
      const isSelected = form.watcherIds.includes(u.id);
      return (
        <button
          key={u.id}
          type="button"
          onClick={() => {
            setForm((prev) => ({
              ...prev,
              watcherIds: isSelected
                ? prev.watcherIds.filter((id) => id !== u.id)
                : [...prev.watcherIds, u.id],
            }));
          }}
          className={clsx(
            'px-3 py-1 rounded-full text-sm border',
            isSelected
              ? 'bg-blue-100 border-blue-500 text-blue-700'
              : 'bg-gray-50 border-gray-200 text-gray-600',
          )}
        >
          {u.fullName}
        </button>
      );
    })}
  </div>
</div>
```

---

- [ ] **Step 5: Pass watcherIds in submit payload**

In `createTask.mutateAsync()`, add:

```typescript
await createTask.mutateAsync({
  title, description, priority,
  projectId: projectId || undefined,
  dueDate: dueDate || undefined,
  assignedTo: assignedTo || undefined,
  watcherIds: form.watcherIds.length > 0 ? form.watcherIds : undefined,
} as any);
```

---

- [ ] **Step 6: Verify build**

Run: `cd apps/web && pnpm build`
Expected: PASS

---

- [ ] **Step 7: Commit**

```bash
git add "apps/web/src/app/(dashboard)/tasks/page.tsx"
git commit -m "feat: add watcher selection to CreateTaskModal

- Add watcherIds to task form state
- Add pill/chip UI for selecting multiple watchers
- Pass watcherIds in createTask mutation payload

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Notes Delete Button in EntityTimeline

**Files:**
- Modify: Find `entity-timeline.tsx` or equivalent notes list component

---

- [ ] **Step 1: Find the notes timeline component**

Run: `npx glob "**/entity-timeline*" "**/*timeline*" "**/*note*" --cwd apps/web/src`
Or search in the file explorer for notes-related components.

Read the relevant file. Identify how each note item is rendered.

---

- [ ] **Step 2: Add deleteNoteMutation if not present**

If `deleteNoteMutation` does not exist in the file, add it (using the same patterns as other mutations in the codebase):

```typescript
const deleteNoteMutation = useMutation({
  mutationFn: (noteId: string) => api.delete(`/notes/${noteId}`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    toast.success('Đã xóa ghi chú');
  },
});
```

---

- [ ] **Step 3: Add delete button to each note item**

Add a trash icon button on each note item:

```tsx
<button
  onClick={() => deleteNoteMutation.mutate(note.id)}
  className="text-gray-400 hover:text-red-500"
  title="Xóa ghi chú"
>
  <Trash2 className="h-4 w-4" />
</button>
```

Use `lucide-react`'s `Trash2` icon (already used in the project). Import it from `lucide-react` if not already imported.

---

- [ ] **Step 4: Verify build**

Run: `cd apps/web && pnpm build`
Expected: PASS

---

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/crm/entity-timeline.tsx
git commit -m "feat: add delete button to notes in timeline

- Add deleteNoteMutation with list invalidation
- Add trash icon button on each note item
- Vietnamese success toast on delete

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Final Verification

After all 6 tasks complete:

1. Run: `cd apps/api && pnpm build` → PASS
2. Run: `cd apps/web && pnpm build` → PASS
3. Run: `pnpm dev` (both api and web)
4. Manual test flows:
   - Create lead → assign to another user → recipient sees notification in bell icon
   - Open lead create modal → select Phụ trách → submit → lead shows assigned name
   - Create deal → deal appears on Kanban without F5
   - Create task → select watchers → watchers appear in task detail
   - Create note → click delete → note disappears from list
   - Check NestJS logs after 1 hour → `"Đã xóa X notes quá 24 giờ."`