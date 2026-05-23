import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotesCleanupService {
  private readonly logger = new Logger(NotesCleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldNotes() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.prisma.note.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        deletedAt: null, // only delete notes not already soft-deleted
      },
    });
    if (result.count > 0) {
      this.logger.log(`Đã xóa ${result.count} ghi chú quá 24 giờ.`);
    }
  }
}
