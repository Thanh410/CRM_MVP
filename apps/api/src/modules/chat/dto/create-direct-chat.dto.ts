import { IsUUID } from 'class-validator';

export class CreateDirectChatDto {
  @IsUUID()
  userId!: string;
}
