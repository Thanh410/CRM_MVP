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

  verifySignature(rawBody: string, signature: string | undefined): boolean {
    const secret = this.config.get<string>('meta.appSecret') ?? this.config.get<string>('META_APP_SECRET') ?? '';
    if (!secret) {
      if (this.config.get<string>('nodeEnv') !== 'production') return true;
      this.logger.error('META_APP_SECRET not configured - cannot verify webhook');
      return false;
    }
    if (!signature || !signature.startsWith('sha256=')) return false;
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

    for (const entry of body.entry ?? []) {
      const accountExternalId = entry.id;
      const channelAccount = accountExternalId
        ? await this.prisma.channelAccount.findFirst({
            where: { channel: 'MESSENGER', externalId: accountExternalId, isActive: true },
          })
        : null;

      if (!channelAccount) {
        this.logger.warn(`No active Messenger channel account found for externalId=${accountExternalId ?? 'unknown'}`);
        continue;
      }

      for (const messaging of entry.messaging ?? []) {
        const senderId: string = messaging.sender?.id;
        const msgId: string = messaging.message?.mid ?? `messenger_${senderId}_${Date.now()}`;
        const text: string = messaging.message?.text ?? '';

        if (!messaging.message || !senderId) continue;

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
    const account = await this.prisma.channelAccount.findFirst({
      where: { id: channelAccountId, channel: 'MESSENGER', isActive: true },
    });
    if (!account) return;

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
