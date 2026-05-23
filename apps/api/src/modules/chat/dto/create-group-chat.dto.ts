import { ArrayNotEmpty, IsArray, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateGroupChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  participantIds!: string[];
}
