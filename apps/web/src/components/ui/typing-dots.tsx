/**
 * TypingDots — 3 dot bouncing, dùng cho inbox khi user bên kia đang gõ.
 * Animation đã định nghĩa trong globals.css (.typing-dot).
 */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex gap-1 items-center ${className ?? ''}`}
      role="status"
      aria-label="Đang nhập"
    >
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </span>
  );
}
