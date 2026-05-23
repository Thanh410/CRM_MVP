import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

interface ChatSocketPayload {
  sub: string;
  orgId: string;
}

@WebSocketGateway({ namespace: 'chat', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<ChatSocketPayload>(token, {
        secret: this.config.get<string>('jwt.secret', 'change_me'),
      });
      client.join(this.orgRoom(payload.orgId));
      client.join(this.userRoom(payload.orgId, payload.sub));
      client.data.userId = payload.sub;
      client.data.orgId = payload.orgId;
    } catch {
      client.disconnect(true);
    }
  }

  emitToConversation(orgId: string, userIds: string[], event: string, payload: unknown) {
    for (const userId of userIds) {
      this.server.to(this.userRoom(orgId, userId)).emit(event, payload);
    }
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.['token'];
    if (typeof authToken === 'string' && authToken) return authToken;

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);
    return undefined;
  }

  private orgRoom(orgId: string) {
    return `org:${orgId}`;
  }

  private userRoom(orgId: string, userId: string) {
    return `org:${orgId}:user:${userId}`;
  }
}
