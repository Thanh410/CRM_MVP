import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type SearchScope = 'all' | 'crm' | 'work' | 'connect' | 'manage';

export class SearchQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['all', 'crm', 'work', 'connect', 'manage'] })
  @IsOptional()
  @IsIn(['all', 'crm', 'work', 'connect', 'manage'])
  scope?: SearchScope = 'all';

  @ApiPropertyOptional({ default: 5, maximum: 10 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}
