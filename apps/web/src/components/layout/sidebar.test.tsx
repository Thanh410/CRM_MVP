import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './sidebar';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/(dashboard)/chat/hooks', () => ({
  useChatUnreadCount: () => ({ data: { count: 7 } }),
}));

vi.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
    clearAuth: vi.fn(),
    refreshToken: 'refresh-token',
  }),
}));

describe('Sidebar', () => {
  it('renders the chat unread badge and hides zero-free badge logic elsewhere', () => {
    render(<Sidebar />);

    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
