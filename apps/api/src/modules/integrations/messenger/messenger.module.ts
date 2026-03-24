import { Module } from '@nestjs/common';
import { MessengerController } from './messenger.controller';
import { MessengerService } from './messenger.service';
import { ConversationsModule } from '../../conversations/conversations.module';

@Module({
  imports: [ConversationsModule],
  controllers: [MessengerController],
  providers: [MessengerService],
})
export class MessengerModule {}
