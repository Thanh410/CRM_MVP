import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatDate, getInitials } from './utils';

describe('cn', () => {
  it('merge nhiều class strings', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('Tailwind conflict resolution: class sau ghi đè class trước', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('hỗ trợ conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
    expect(cn('base', true && 'shown')).toBe('base shown');
  });

  it('hỗ trợ object syntax', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });
});

describe('formatCurrency', () => {
  it('format VND mặc định, có dấu phân cách hàng nghìn', () => {
    const result = formatCurrency(1500000);
    // VND format vi-VN: "1.500.000 ₫" hoặc "1500000 ₫" tuỳ runtime ICU
    expect(result).toMatch(/1\.?500\.?000.*₫|VND/);
  });

  it('không có chữ số thập phân', () => {
    const result = formatCurrency(99.99);
    expect(result).not.toContain('.99');
    expect(result).not.toContain(',99');
  });

  it('hỗ trợ currency khác (USD)', () => {
    const result = formatCurrency(1000, 'USD');
    expect(result).toContain('1');
  });

  it('hỗ trợ số 0', () => {
    expect(formatCurrency(0)).toMatch(/0.*₫|VND/);
  });

  it('hỗ trợ số âm', () => {
    const result = formatCurrency(-500000);
    expect(result).toMatch(/-|−/);
  });
});

describe('formatDate', () => {
  it('format DD/MM/YYYY mặc định', () => {
    expect(formatDate('2026-05-14')).toBe('14/05/2026');
  });

  it('zero-pad day và month', () => {
    expect(formatDate('2026-01-05')).toBe('05/01/2026');
  });

  it('chấp nhận Date object', () => {
    const d = new Date(2026, 4, 14); // tháng tính từ 0 → tháng 5
    expect(formatDate(d)).toBe('14/05/2026');
  });

  it('custom format', () => {
    expect(formatDate('2026-05-14', 'YYYY-MM-DD')).toBe('2026-05-14');
    expect(formatDate('2026-05-14', 'DD-MM-YYYY')).toBe('14-05-2026');
  });
});

describe('getInitials', () => {
  it('lấy 2 chữ cái đầu cuối (họ + tên)', () => {
    expect(getInitials('Nguyễn Văn A')).toBe('VA');
    expect(getInitials('Trần Thị Bình')).toBe('TB');
  });

  it('uppercase toàn bộ', () => {
    expect(getInitials('nguyễn văn an')).toBe('VA');
  });

  it('1 từ duy nhất → 1 chữ cái', () => {
    expect(getInitials('Admin')).toBe('A');
  });

  it('xử lý nhiều khoảng trắng liền nhau', () => {
    expect(getInitials('Nguyễn  Văn   A')).toBe('VA');
  });

  it('chuỗi rỗng → chuỗi rỗng', () => {
    expect(getInitials('')).toBe('');
  });

  it('chỉ lấy 2 ký tự cuối nếu tên rất dài', () => {
    expect(getInitials('Nguyễn Văn Tiến Đạt')).toBe('TĐ');
  });
});
