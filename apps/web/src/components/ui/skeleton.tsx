import { cn } from '@/lib/utils';

/**
 * Generic skeleton block with Tailwind shimmer animation.
 *
 * Usage:
 *   <Skeleton className="h-4 w-32" />
 *   <Skeleton className="h-10 w-10 rounded-full" />
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-zinc-100', className)}
      {...props}
    />
  );
}

/**
 * Pre-built skeleton row for tables.
 * Renders N rows × M columns of skeleton placeholders.
 */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-zinc-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className={cn(
                'h-4',
                j === 0 ? 'w-32' : j === cols - 1 ? 'w-16' : 'flex-1',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton card cho dashboard stats, leads detail, etc.
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-zinc-200 bg-white p-5', className)}>
      <Skeleton className="h-4 w-4 mb-3" />
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/**
 * Skeleton cho kanban column.
 */
export function KanbanSkeleton({ columns = 4, cardsPerColumn = 3 }: { columns?: number; cardsPerColumn?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="w-72 shrink-0 bg-zinc-50 rounded-xl border border-zinc-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: cardsPerColumn }).map((_, j) => (
              <div key={j} className="bg-white rounded-lg border border-zinc-200 p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
