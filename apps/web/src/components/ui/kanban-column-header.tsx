import { cn } from '@/lib/utils';

export type KanbanStage =
  | 'potential'
  | 'contacted'
  | 'quoted'
  | 'negotiate'
  | 'won'
  | 'lost'
  | 'todo'
  | 'inProgress'
  | 'review'
  | 'done';

const stageStyles: Record<KanbanStage, string> = {
  potential: 'from-aurora-violet/10 to-aurora-violet/5 ring-aurora-violet/20',
  contacted: 'from-aurora-indigo/10 to-aurora-cyan/10 ring-aurora-indigo/20',
  quoted: 'from-aurora-cyan/10 to-aurora-mint/10 ring-aurora-cyan/20',
  negotiate: 'from-amber-100 to-orange-100/60 ring-amber-300/40 dark:from-amber-950/40 dark:to-orange-950/30',
  won: 'from-emerald-100 to-emerald-50 ring-emerald-300/40 dark:from-emerald-950/40 dark:to-emerald-950/20',
  lost: 'from-rose-100 to-rose-50 ring-rose-300/40 dark:from-rose-950/40 dark:to-rose-950/20',
  todo: 'from-muted to-muted/50 ring-border',
  inProgress: 'from-aurora-indigo/10 to-aurora-cyan/10 ring-aurora-indigo/20',
  review: 'from-amber-100 to-orange-100/60 ring-amber-300/40 dark:from-amber-950/40 dark:to-orange-950/30',
  done: 'from-emerald-100 to-emerald-50 ring-emerald-300/40 dark:from-emerald-950/40 dark:to-emerald-950/20',
};

const stageDot: Record<KanbanStage, string> = {
  potential: 'bg-aurora-violet',
  contacted: 'bg-aurora-indigo',
  quoted: 'bg-aurora-cyan',
  negotiate: 'bg-amber-500',
  won: 'bg-emerald-500',
  lost: 'bg-rose-500',
  todo: 'bg-muted-foreground',
  inProgress: 'bg-aurora-indigo',
  review: 'bg-amber-500',
  done: 'bg-emerald-500',
};

export interface KanbanColumnHeaderProps {
  stage: KanbanStage;
  name: string;
  count: number;
  /** "1.2 tỷ · TB 240tr/deal" */
  valueLabel?: string;
  onAdd?: () => void;
  className?: string;
}

/**
 * KanbanColumnHeader — header gradient cho mỗi cột kanban.
 * Stage quyết định gradient + dot color; phần body card render bên ngoài.
 */
export function KanbanColumnHeader({
  stage,
  name,
  count,
  valueLabel,
  onAdd,
  className,
}: KanbanColumnHeaderProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-3 bg-gradient-to-br ring-1',
        stageStyles[stage],
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', stageDot[stage])} />
          <span className="text-xs font-bold uppercase tracking-wide text-foreground">{name}</span>
          <span className="text-[10px] font-bold opacity-70 text-foreground">{count}</span>
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="opacity-70 hover:opacity-100 text-foreground"
            aria-label={`Thêm vào ${name}`}
          >
            +
          </button>
        )}
      </div>
      {valueLabel && (
        <div className="text-[11px] text-muted-foreground mt-0.5">{valueLabel}</div>
      )}
    </div>
  );
}
