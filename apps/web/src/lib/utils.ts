import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format số tiền VND dạng compact: 1.5tr, 250tr, 1.2tỷ
 * Dùng cho dashboard, kanban headers — nơi cần ngắn gọn.
 */
export function formatCompactVND(amount: number): string {
  if (!amount || isNaN(amount)) return '0₫';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) return `${sign}${(amount / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '')} tỷ`;
  if (abs >= 1_000_000) return `${sign}${(amount / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')} tr`;
  if (abs >= 1_000) return `${sign}${(amount / 1_000).toFixed(0)}K`;
  return `${sign}${abs}₫`;
}

export function formatDate(date: string | Date, format = 'DD/MM/YYYY'): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return format.replace('DD', day).replace('MM', month).replace('YYYY', String(year));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}
