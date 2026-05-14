import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client with connection pool tuning and graceful shutdown.
 *
 * Pool sizing:
 *   - Connection limit/timeout được set qua DATABASE_URL query params:
 *     ?connection_limit=20&pool_timeout=20
 *   - Default cho 30 users đồng thời: connection_limit=20 (Prisma docs khuyến nghị)
 *   - Production có thể tăng lên 30-40 nếu PG max_connections cho phép
 *
 * Graceful shutdown: gọi $disconnect() khi NestJS shutdown để tránh
 * connection leak và transaction dangling.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env['NODE_ENV'] === 'development'
          ? ['warn', 'error']
          : ['warn', 'error'],
      errorFormat: process.env['NODE_ENV'] === 'development' ? 'pretty' : 'minimal',
    });
  }

  async onModuleInit() {
    const start = Date.now();
    try {
      await this.$connect();
      this.logger.log(`Connected to PostgreSQL in ${Date.now() - start}ms`);
    } catch (err) {
      this.logger.error('Failed to connect to PostgreSQL', err);
      throw err;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from PostgreSQL...');
    await this.$disconnect();
  }
}
