import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const STORAGE_KEY = 'crm-auth';

function getStoredAuth() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setStoredTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  const inLocal = !!localStorage.getItem(STORAGE_KEY);
  const storage = inLocal ? localStorage : sessionStorage;
  try {
    const current = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}');
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...current, accessToken, refreshToken }));
  } catch {}
}

// Attach access token
api.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.accessToken) config.headers.Authorization = `Bearer ${auth.accessToken}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const auth = getStoredAuth();
        if (!auth?.refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api'}/auth/refresh`,
          { refreshToken: auth.refreshToken },
        );

        setStoredTokens(data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
