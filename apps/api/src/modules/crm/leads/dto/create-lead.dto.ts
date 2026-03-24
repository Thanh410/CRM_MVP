import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsEnum, IsUUID } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class CreateLeadDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: 'nguyenvana@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: LeadStatus, default: 'NEW' })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ example: 'facebook', description: 'facebook | zalo | website | referral | cold_call' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}
