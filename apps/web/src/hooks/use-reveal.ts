import { useEffect, useRef, useState } from 'react';

/**
 * useReveal — set `visible=true` khi element scroll vào viewport.
 * Disconnect observer ngay sau lần đầu để chỉ chạy 1 lần.
 *
 * Usage:
 *   const { ref, visible } = useReveal();
 *   <div ref={ref} className={`reveal ${visible ? 'in' : ''}`} />
 */
export function useReveal<T extends Element = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const node = ref.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}
