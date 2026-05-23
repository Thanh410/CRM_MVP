'use client';

import { Send } from 'lucide-react';
import { RippleButton } from '@/components/ui/ripple-button';

export function ChatComposer({
  value,
  sending,
  onChange,
  onSend,
}: {
  value: string;
  sending?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="border-t border-border bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:p-4">
      <div className="flex items-end gap-2 rounded-2xl bg-muted p-2">
        <textarea
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && value.trim()) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Nhập tin nhắn..."
          className="max-h-32 min-h-9 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground"
        />
        <RippleButton onClick={onSend} disabled={sending || !value.trim()} aria-label="Gửi tin nhắn">
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Gửi</span>
        </RippleButton>
      </div>
    </div>
  );
}
