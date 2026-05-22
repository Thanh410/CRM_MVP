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

  verifySignature(rawBody: string, signature: string | undefined): boolean {
    const secret = this.config.get<string>('zalo.appSecret') ?? this.config.get<string>('ZALO_APP_SECRET') ?? '';
    if (!secret) {
      if (this.config.get<string>('nodeEnv') !== 'production') return true;
      this.logger.error('ZALO_APP_SECRET not configured - cannot verify webhook');
      return false;
    }
    if (!signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
    } catch {
      return false;
    }
  }

  async handleInbound(body: any) {
    const accountExternalId = body.recipient?.id ?? body.oa_id ?? this.config.get<string>('zalo.oaId');
    const channelAccount = accountExternalId
      ? await this.prisma.channelAccount.findFirst({
          where: { channel: 'ZALO', externalId: accountExternalId, isActive: true },
        })
      : null;

    if (!channelAccount) {
      this.logger.warn(`No active Zalo channel account found for externalId=${accountExternalId ?? 'unknown'}`);
      return { received: true };
    }

    await this.prisma.channelWebhook.create({
      data: {
        channelAccountId: channelAccount.id,
        eventType: body.event_name ?? body.event ?? 'unknown',
        payload: body,
        processed: false,
      },
    });

    const eventName = body.event_name ?? body.event;
    const message = body.message ?? (body.content ? { text: body.content } : undefined);
    if (eventName === 'user_send_text' && message) {
      const senderId = body.sender?.id ?? body.user_id_by_app ?? body.from;
      const msgId = message?.msg_id ?? `zalo_${senderId}_${Date.now()}`;
      const content = message?.text ?? body.content ?? '';

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
    const account = await this.prisma.channelAccount.findFirst({
      where: { id: channelAccountId, channel: 'ZALO', isActive: true },
    });
    if (!account) return;

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
        access_token: accessToken,
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
