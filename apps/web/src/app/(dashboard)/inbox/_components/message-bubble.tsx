import type { Message } from '../types';

export function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'OUTBOUND';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs rounded-2xl px-4 py-2 text-sm lg:max-w-md ${
          isOutbound
            ? 'btn-aurora rounded-tr-sm text-white shadow-pop'
            : 'rounded-tl-sm border border-border bg-card text-foreground shadow-soft'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`mt-1 text-[10px] ${isOutbound ? 'text-white/70' : 'text-muted-foreground'}`}>
          {new Date(message.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          {isOutbound && ' · đã gửi'}
        </p>
      </div>
    </div>
  );
}
