import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../common/services/encryption.service';
import { ConversationsService } from '../../conversations/conversations.service';
import * as crypto from 'crypto';

@Injectable()
export class ZaloService {
  private readonly logger = new Logger(ZaloService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private conversationsService: ConversationsService,
  ) {}

  verifyToken(token: string): boolean {
    return token === this.config.get('zalo.webhookSecret') || token === this.config.get('ZALO_VERIFY_TOKEN');
  }

  /**
   * Verify Zalo webhook HMAC-SHA256 signature.
   * Uses timing-safe comparison to prevent timing attacks.
   */
  verifySignature(rawBody: string, signature: string | undefined): boolean {
    if (!signature) return false;
    const secret = this.config.get<string>('zalo.appSecret') ?? this.config.get<string>('ZALO_APP_SECRET') ?? '';
    if (!secret) {
      this.logger.error('ZALO_APP_SECRET not configured — cannot verify webhook');
      return false;
    }
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
    } catch {
      return false;
    }
  }

  async handleInbound(body: any) {
    const channelAccount = await this.prisma.channelAccount.findFirst({
      where: { channel: 'ZALO', isActive: true },
    });

    if (!channelAccount) {
      this.logger.warn('No active Zalo channel account found');
      return { received: true };
    }

    await this.prisma.channelWebhook.create({
      data: {
        channelAccountId: channelAccount.id,
        eventType: body.event_name ?? 'unknown',
        payload: body,
        processed: false,
      },
    });

    if (body.event_name === 'user_send_text' && body.message) {
      const senderId = body.sender?.id ?? body.user_id_by_app;
      const msgId = body.message?.msg_id ?? `zalo_${Date.now()}`;
      const content = body.message?.text ?? '';

      await this.conversationsService.receiveMessage({
        orgId: channelAccount.orgId,
        channelAccountId: channelAccount.id,
        externalConvoId: senderId,
        externalMsgId: msgId,
        content,
        rawPayload: body,
        senderExternalId: senderId,
      });

      await this.prisma.channelWebhook.updateMany({
        where: { channelAccountId: channelAccount.id, processed: false },
        data: { processed: true },
      });
    }

    return { received: true };
  }

  async sendReply(channelAccountId: string, recipientId: string, text: string) {
    const account = await this.prisma.channelAccount.findUnique({ where: { id: channelAccountId } });
    if (!account) return;

    // Decrypt credentials (supports plaintext fallback for legacy data)
    const creds = this.encryption.decryptOrPassthrough<{ accessToken?: string }>(account.credentialsEnc);
    const accessToken = creds?.accessToken;
    if (!accessToken) {
      this.logger.error(`Zalo channel ${channelAccountId} has no accessToken`);
      return false;
    }

    const res = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': accessToken,
      },
      body: JSON.stringify({
        recipient: { user_id: recipientId },
        message: { text },
      }),
    });

    if (!res.ok) {
      this.logger.error(`Zalo send failed: ${res.status} ${await res.text()}`);
    }
    return res.ok;
  }
}
