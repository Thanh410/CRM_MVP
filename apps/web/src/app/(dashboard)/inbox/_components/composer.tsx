'use client';

import { Send, Smile, Paperclip } from 'lucide-react';
import { RippleButton } from '@/components/ui/ripple-button';

export function Composer({
  name,
  value,
  sending,
  onChange,
  onSend,
}: {
  name: string;
  value: string;
  sending?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex items-end gap-2 rounded-2xl bg-muted p-2">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-card"
          title="Đính kèm"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-card"
          title="Emoji"
        >
          <Smile className="h-4 w-4" />
        </button>
        <textarea
          rows={1}
          className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          placeholder={`Trả lời ${name}...`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && value.trim()) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <RippleButton
          variant="aurora"
          size="md"
          onClick={onSend}
          disabled={sending || !value.trim()}
          aria-label="Gửi tin nhắn"
        >
          <Send className="h-4 w-4" />
          Gửi
        </RippleButton>
      </div>
    </div>
  );
}
