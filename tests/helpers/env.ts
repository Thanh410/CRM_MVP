// tests/helpers/env.ts
// Lazy-loads .env.test so it works in both main process and Playwright workers.
// dotenv/config import at top-level ensures it runs before any test code reads env vars.
import 'dotenv/config';
import path from 'path';

let _apiUrl: string | undefined;
let _frontendUrl: string | undefined;

/** Returns API_BASE_URL, reading from process.env (already loaded by dotenv/config). */
export function getApiUrl(): string {
  if (!_apiUrl) {
    _apiUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
  }
  return _apiUrl;
}

/** Returns FRONTEND_URL. */
export function getFrontendUrl(): string {
  if (!_frontendUrl) {
    _frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
  }
  return _frontendUrl;
}
