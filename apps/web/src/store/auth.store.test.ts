import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './auth.store';

const mockUser = {
  id: 'user-1',
  email: 'sales@x.vn',
  fullName: 'Nguyễn Văn A',
  orgId: 'org-1',
  roles: ['SALES'],
  permissions: ['leads:read', 'leads:create'],
};

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store + storage giữa các test
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.getState().clearAuth();
  });

  describe('setAuth', () => {
    it('lưu user + tokens, set isAuthenticated=true', () => {
      useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('access-token');
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('rememberMe=true → lưu vào localStorage', () => {
      useAuthStore.getState().setAuth(mockUser, 'access', 'refresh', true);

      const saved = JSON.parse(localStorage.getItem('crm-auth') ?? '{}');
      expect(saved.accessToken).toBe('access');
      expect(sessionStorage.getItem('crm-auth')).toBeNull();
    });

    it('rememberMe=false → lưu vào sessionStorage', () => {
      useAuthStore.getState().setAuth(mockUser, 'access', 'refresh', false);

      const saved = JSON.parse(sessionStorage.getItem('crm-auth') ?? '{}');
      expect(saved.accessToken).toBe('access');
      expect(localStorage.getItem('crm-auth')).toBeNull();
    });

    it('chuyển từ sessionStorage sang localStorage khi rememberMe thay đổi', () => {
      useAuthStore.getState().setAuth(mockUser, 'a1', 'r1', false);
      expect(sessionStorage.getItem('crm-auth')).not.toBeNull();

      useAuthStore.getState().setAuth(mockUser, 'a2', 'r2', true);
      expect(sessionStorage.getItem('crm-auth')).toBeNull();
      expect(localStorage.getItem('crm-auth')).not.toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('xóa user + tokens, set isAuthenticated=false', () => {
      useAuthStore.getState().setAuth(mockUser, 'access', 'refresh');
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('xóa cả localStorage và sessionStorage', () => {
      useAuthStore.getState().setAuth(mockUser, 'a', 'r', true);
      useAuthStore.getState().clearAuth();

      expect(localStorage.getItem('crm-auth')).toBeNull();
      expect(sessionStorage.getItem('crm-auth')).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('trả về false khi chưa đăng nhập', () => {
      expect(useAuthStore.getState().hasPermission('leads:read')).toBe(false);
    });

    it('SUPER_ADMIN bypass tất cả permissions', () => {
      const superAdmin = { ...mockUser, roles: ['SUPER_ADMIN'], permissions: [] };
      useAuthStore.getState().setAuth(superAdmin, 'a', 'r');

      expect(useAuthStore.getState().hasPermission('anything:do')).toBe(true);
      expect(useAuthStore.getState().hasPermission('reports:delete')).toBe(true);
    });

    it('ADMIN bypass tất cả permissions', () => {
      const admin = { ...mockUser, roles: ['ADMIN'], permissions: [] };
      useAuthStore.getState().setAuth(admin, 'a', 'r');

      expect(useAuthStore.getState().hasPermission('leads:delete')).toBe(true);
    });

    it('SALES chỉ có permissions được gán', () => {
      useAuthStore.getState().setAuth(mockUser, 'a', 'r');

      expect(useAuthStore.getState().hasPermission('leads:read')).toBe(true);
      expect(useAuthStore.getState().hasPermission('leads:create')).toBe(true);
      expect(useAuthStore.getState().hasPermission('leads:delete')).toBe(false);
      expect(useAuthStore.getState().hasPermission('users:create')).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('trả về false khi chưa đăng nhập', () => {
      expect(useAuthStore.getState().hasRole('SALES')).toBe(false);
    });

    it('trả về true khi user có role đó', () => {
      useAuthStore.getState().setAuth(mockUser, 'a', 'r');

      expect(useAuthStore.getState().hasRole('SALES')).toBe(true);
      expect(useAuthStore.getState().hasRole('ADMIN')).toBe(false);
    });

    it('hỗ trợ user có nhiều roles', () => {
      const multi = { ...mockUser, roles: ['SALES', 'MANAGER'] };
      useAuthStore.getState().setAuth(multi, 'a', 'r');

      expect(useAuthStore.getState().hasRole('SALES')).toBe(true);
      expect(useAuthStore.getState().hasRole('MANAGER')).toBe(true);
      expect(useAuthStore.getState().hasRole('STAFF')).toBe(false);
    });
  });
});
