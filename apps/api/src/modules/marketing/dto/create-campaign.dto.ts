import { IsString, IsOptional, IsEnum, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus, CampaignChannel } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: CampaignChannel })
  @IsEnum(CampaignChannel)
  channel: CampaignChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'JSON filter for audience segmentation' })
  @IsOptional()
  @IsObject()
  audienceFilter?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;
}

export class CreateTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: CampaignChannel })
  @IsEnum(CampaignChannel)
  channel: CampaignChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty()
  @IsString()
  body: string;
}
