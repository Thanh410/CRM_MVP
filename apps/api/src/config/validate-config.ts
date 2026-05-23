/**
 * Validate environment configuration at startup.
 * Refuses to start in production if critical secrets are missing or use defaults.
 */
export function validateConfig(env: Record<string, unknown>): Record<string, unknown> {
  const isProd = (env['NODE_ENV'] ?? 'development') === 'production';

  // Forbidden default values — these MUST be changed for production
  const insecureDefaults: Record<string, string[]> = {
    JWT_SECRET: ['change_me', 'change_me_refresh', ''],
    JWT_REFRESH_SECRET: ['change_me', 'change_me_refresh', ''],
    ENCRYPTION_KEY: ['00000000000000000000000000000000', ''],
    POSTGRES_PASSWORD: ['', 'crm_password_change_me', 'change_me'],
  };

  const errors: string[] = [];

  for (const [key, badValues] of Object.entries(insecureDefaults)) {
    const value = (env[key] as string) ?? '';
    if (isProd && badValues.includes(value)) {
      errors.push(
        `Environment variable ${key} is missing or using insecure default. ` +
          `Set a strong unique value in production.`,
      );
    }
  }

  // Minimum length checks for JWT secrets
  if (isProd) {
    const jwt = (env['JWT_SECRET'] as string) ?? '';
    const jwtRefresh = (env['JWT_REFRESH_SECRET'] as string) ?? '';
    if (jwt.length < 32) errors.push('JWT_SECRET must be at least 32 characters in production');
    if (jwtRefresh.length < 32) errors.push('JWT_REFRESH_SECRET must be at least 32 characters in production');
    if (jwt === jwtRefresh) errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n  - ${errors.join('\n  - ')}\n\n` +
        `Generate strong secrets with: openssl rand -hex 32`,
    );
  }

  return env;
}
