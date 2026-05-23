import { ApiPropertyOptional } from '@nestjs/swagger';
import { DealStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class QueryDealDto extends PaginationDto {
  @ApiPropertyOptional({ enum: DealStatus })
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  stageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  pipelineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  closeDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  closeDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}
