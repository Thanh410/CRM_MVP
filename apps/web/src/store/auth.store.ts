import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  orgId: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string, rememberMe?: boolean) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const STORAGE_KEY = 'crm-auth';

function loadFromStorage(): Partial<AuthState> {
  if (typeof window === 'undefined') return {};
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) return JSON.parse(local);
    const session = sessionStorage.getItem(STORAGE_KEY);
    if (session) return JSON.parse(session);
  } catch {}
  return {};
}

function saveToStorage(data: object, rememberMe: boolean) {
  const json = JSON.stringify(data);
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEY, json);
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, json);
    localStorage.removeItem(STORAGE_KEY);
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

const saved = loadFromStorage();

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: (saved as any).user ?? null,
  accessToken: (saved as any).accessToken ?? null,
  refreshToken: (saved as any).refreshToken ?? null,
  isAuthenticated: !!(saved as any).accessToken,

  setAuth: (user, accessToken, refreshToken, rememberMe = true) => {
    saveToStorage({ user, accessToken, refreshToken }, rememberMe);
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  clearAuth: () => {
    clearStorage();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    if (user.roles.includes('SUPER_ADMIN') || user.roles.includes('ADMIN')) return true;
    return user.permissions.includes(permission);
  },

  hasRole: (role: string) => {
    const { user } = get();
    return user?.roles.includes(role) ?? false;
  },
}));
