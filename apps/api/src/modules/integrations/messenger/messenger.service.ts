import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../common/services/encryption.service';
import { ConversationsService } from '../../conversations/conversations.service';
import * as crypto from 'crypto';

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private conversationsService: ConversationsService,
  ) {}

  verifyToken(token: string): boolean {
    return token === this.config.get('meta.verifyToken') || token === this.config.get('META_VERIFY_TOKEN');
  }

  /**
   * Verify Meta webhook X-Hub-Signature-256 (HMAC-SHA256 of raw body).
   * Header format: "sha256=<hex>"
   * Uses timing-safe comparison to prevent timing attacks.
   */
  verifySignature(rawBody: string, signature: string | undefined): boolean {
    if (!signature || !signature.startsWith('sha256=')) return false;
    const secret = this.config.get<string>('meta.appSecret') ?? this.config.get<string>('META_APP_SECRET') ?? '';
    if (!secret) {
      this.logger.error('META_APP_SECRET not configured — cannot verify webhook');
      return false;
    }
    const provided = signature.slice('sha256='.length);
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));
    } catch {
      return false;
    }
  }

  async handleInbound(body: any) {
    if (body.object !== 'page') return { received: true };

    const channelAccount = await this.prisma.channelAccount.findFirst({
      where: { channel: 'MESSENGER', isActive: true },
    });

    if (!channelAccount) {
      this.logger.warn('No active Messenger channel account found');
      return { received: true };
    }

    for (const entry of body.entry ?? []) {
      for (const messaging of entry.messaging ?? []) {
        const senderId: string = messaging.sender?.id;
        const msgId: string = messaging.message?.mid;
        const text: string = messaging.message?.text ?? '';

        if (!messaging.message || !msgId) continue;

        await this.prisma.channelWebhook.create({
          data: {
            channelAccountId: channelAccount.id,
            eventType: 'message',
            payload: messaging,
            processed: false,
          },
        });

        await this.conversationsService.receiveMessage({
          orgId: channelAccount.orgId,
          channelAccountId: channelAccount.id,
          externalConvoId: senderId,
          externalMsgId: msgId,
          content: text,
          rawPayload: messaging,
          senderExternalId: senderId,
        });

        await this.prisma.channelWebhook.updateMany({
          where: { channelAccountId: channelAccount.id, processed: false },
          data: { processed: true },
        });
      }
    }

    return { received: true };
  }

  async sendReply(channelAccountId: string, recipientId: string, text: string) {
    const account = await this.prisma.channelAccount.findUnique({ where: { id: channelAccountId } });
    if (!account) return;

    // Decrypt credentials (supports plaintext fallback for legacy data)
    const creds = this.encryption.decryptOrPassthrough<{ pageAccessToken?: string }>(account.credentialsEnc);
    const pageAccessToken = creds?.pageAccessToken;
    if (!pageAccessToken) {
      this.logger.error(`Messenger channel ${channelAccountId} has no pageAccessToken`);
      return false;
    }

    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      },
    );

    if (!res.ok) {
      this.logger.error(`Messenger send failed: ${res.status} ${await res.text()}`);
    }
    return res.ok;
  }
}
