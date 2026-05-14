// k6 auth helper — đăng nhập, lấy access token, cache trong VU context
import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

// Demo accounts từ seed (10 users mặc định)
// Trong test khác nhau, mỗi VU dùng 1 account để mô phỏng 30 users đồng thời
const DEMO_USERS = [
  { email: 'superadmin@abc.com.vn', password: 'Admin@123456' },
  { email: 'admin@abc.com.vn', password: 'Admin@123456' },
  { email: 'manager.sales@abc.com.vn', password: 'Admin@123456' },
  { email: 'sales1@abc.com.vn', password: 'Admin@123456' },
  { email: 'sales2@abc.com.vn', password: 'Admin@123456' },
  { email: 'sales3@abc.com.vn', password: 'Admin@123456' },
  { email: 'marketing@abc.com.vn', password: 'Admin@123456' },
  { email: 'support@abc.com.vn', password: 'Admin@123456' },
  { email: 'staff1@abc.com.vn', password: 'Admin@123456' },
  { email: 'staff2@abc.com.vn', password: 'Admin@123456' },
];

/**
 * Login và trả về { accessToken, refreshToken, user }
 * Mỗi VU được gán 1 user qua __VU index (round-robin)
 */
export function login() {
  const user = DEMO_USERS[(__VU - 1) % DEMO_USERS.length];

  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'auth/login' },
    },
  );

  const ok = check(res, {
    'login status 200/201': (r) => r.status === 200 || r.status === 201,
    'login returns accessToken': (r) => {
      try { return !!r.json('accessToken'); } catch { return false; }
    },
  });

  if (!ok) {
    fail(`Login thất bại cho ${user.email}: ${res.status} ${res.body?.slice(0, 200)}`);
  }

  return {
    accessToken: res.json('accessToken'),
    refreshToken: res.json('refreshToken'),
    user: res.json('user'),
  };
}

/**
 * Build headers với Bearer token cho các request authenticated
 */
export function authHeaders(token) {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Logout — revoke refresh token
 */
export function logout(accessToken, refreshToken) {
  return http.post(
    `${BASE_URL}/auth/logout`,
    JSON.stringify({ refreshToken }),
    {
      ...authHeaders(accessToken),
      tags: { name: 'auth/logout' },
    },
  );
}
