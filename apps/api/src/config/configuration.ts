export default () => ({
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:3001',

  database: {
    url: process.env['DATABASE_URL'],
  },

  redis: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'] ?? undefined,
  },

  jwt: {
    secret: process.env['JWT_SECRET'] ?? 'change_me',
    accessExpires: process.env['JWT_ACCESS_EXPIRES'] ?? '15m',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'change_me_refresh',
    refreshExpires: process.env['JWT_REFRESH_EXPIRES'] ?? '7d',
  },

  s3: {
    endpoint: process.env['S3_ENDPOINT'] ?? 'http://localhost:9000',
    accessKey: process.env['S3_ACCESS_KEY'] ?? 'minioadmin',
    secretKey: process.env['S3_SECRET_KEY'] ?? 'minioadmin',
    bucket: process.env['S3_BUCKET'] ?? 'crm-files',
    region: process.env['S3_REGION'] ?? 'us-east-1',
    useSsl: process.env['S3_USE_SSL'] === 'true',
  },

  encryption: {
    key: process.env['ENCRYPTION_KEY'] ?? '00000000000000000000000000000000',
  },

  throttle: {
    ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60', 10),
    limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
  },

  zalo: {
    oaId: process.env['ZALO_OA_ID'],
    appId: process.env['ZALO_APP_ID'],
    appSecret: process.env['ZALO_APP_SECRET'],
    webhookSecret: process.env['ZALO_WEBHOOK_SECRET'],
  },

  meta: {
    appId: process.env['META_APP_ID'],
    appSecret: process.env['META_APP_SECRET'],
    pageAccessToken: process.env['META_PAGE_ACCESS_TOKEN'],
    verifyToken: process.env['META_VERIFY_TOKEN'],
  },
});
