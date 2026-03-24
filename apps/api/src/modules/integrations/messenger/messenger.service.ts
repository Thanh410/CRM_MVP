import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConversationsService } from '../../conversations/conversations.service';

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private conversationsService: ConversationsService,
  ) {}

  verifyToken(token: string): boolean {
    return token === this.config.get('META_VERIFY_TOKEN');
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

    const creds = account.credentialsEnc as any;
    const pageAccessToken = creds?.pageAccessToken;

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
