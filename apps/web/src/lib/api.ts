import axios from 'axios';

function getBaseURL() {
  // Server-side (SSR): always use env or localhost
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
  }
  // Client-side: if explicit API URL is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Use relative "/api" — Next.js rewrites will proxy to backend
  // This works with ngrok, LAN IP, any hostname (only 1 tunnel needed)
  return '/api';
}

export const api = axios.create({
  baseURL: getBaseURL(),
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
          `${getBaseURL()}/auth/refresh`,
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
