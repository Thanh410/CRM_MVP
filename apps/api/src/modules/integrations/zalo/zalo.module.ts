import { Module } from '@nestjs/common';
import { ZaloController } from './zalo.controller';
import { ZaloService } from './zalo.service';
import { ConversationsModule } from '../../conversations/conversations.module';

@Module({
  imports: [ConversationsModule],
  controllers: [ZaloController],
  providers: [ZaloService],
})
export class ZaloModule {}
