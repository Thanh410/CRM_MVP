import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Xóa audit logs cũ hơn AUDIT_LOG_RETENTION_DAYS (mặc định 365).
 * Chạy 1 lần/ngày lúc 2h sáng (giờ Việt Nam, ít traffic nhất).
 *
 * Audit logs là append-only, sẽ tăng vô hạn nếu không cleanup.
 * Ước tính ~1000 events/ngày/org → ~365K rows/năm → cần retention policy.
 *
 * Set AUDIT_LOG_RETENTION_DAYS=0 để disable cleanup (giữ vĩnh viễn).
 */
@Injectable()
export class AuditCleanupService {
  private readonly logger = new Logger(AuditCleanupService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Cron('0 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async cleanupOldAuditLogs() {
    const retentionDays = parseInt(
      this.config.get<string>('AUDIT_LOG_RETENTION_DAYS') ?? '365',
      10,
    );

    if (retentionDays <= 0) {
      this.logger.log('Audit log cleanup disabled (AUDIT_LOG_RETENTION_DAYS=0)');
      return;
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // Xóa theo batch 10k để tránh lock table lâu trên DB lớn
    const batchSize = 10_000;
    let totalDeleted = 0;
    let batch = 0;

    while (true) {
      // Prisma không hỗ trợ LIMIT trong deleteMany, dùng raw query
      const result = await this.prisma.$executeRawUnsafe(
        `DELETE FROM audit_logs WHERE id IN (
           SELECT id FROM audit_logs WHERE "createdAt" < $1 LIMIT $2
         )`,
        cutoff,
        batchSize,
      );

      if (result === 0) break;
      totalDeleted += result;
      batch += 1;

      // Safety: tối đa 100 batch (1M rows) mỗi lần chạy
      if (batch >= 100) {
        this.logger.warn(
          `Audit cleanup đã đạt giới hạn 100 batches (${totalDeleted} rows). ` +
            `Sẽ tiếp tục ở lần chạy sau.`,
        );
        break;
      }
    }

    if (totalDeleted > 0) {
      this.logger.log(
        `Đã xóa ${totalDeleted.toLocaleString('vi-VN')} audit logs cũ hơn ` +
          `${retentionDays} ngày (cutoff: ${cutoff.toISOString()})`,
      );
    }
  }
}
