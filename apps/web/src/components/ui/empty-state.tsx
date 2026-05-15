import { cn } from '@/lib/utils';
import { LucideIcon, Plus, Search } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  /** Lucide icon (mặc định: Search) — hiển thị trong hình tròn nền nhạt */
  icon?: LucideIcon;
  /** Tiêu đề chính */
  title: string;
  /** Mô tả phụ */
  description?: string;
  /** Hints dạng bullet list — hướng dẫn user tiếp theo */
  hints?: string[];
  /** Primary CTA — thường là button "Thêm mới" */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary CTA — vd "Import CSV" */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Custom illustration thay cho icon */
  illustration?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Search,
  title,
  description,
  hints,
  action,
  secondaryAction,
  illustration,
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon ?? Plus;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      {illustration ?? (
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
          <Icon size={28} className="text-zinc-400" strokeWidth={1.5} />
        </div>
      )}

      <h3 className="text-base font-semibold text-zinc-900 mb-1">{title}</h3>

      {description && (
        <p className="text-sm text-zinc-500 max-w-md mb-4">{description}</p>
      )}

      {hints && hints.length > 0 && (
        <ul className="text-xs text-zinc-500 text-left space-y-1 mb-5 max-w-md">
          {hints.map((hint, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-zinc-300 mt-0.5">•</span>
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-2">
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <ActionIcon size={14} />
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              {SecondaryIcon && <SecondaryIcon size={14} />}
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
