import { IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class QueryTaskDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter: my tasks only' })
  @IsOptional()
  mine?: string;

  @ApiPropertyOptional({ description: 'Filter: tasks watched by current user' })
  @IsOptional()
  watched?: string;

  @ApiPropertyOptional({ description: 'Filter: overdue tasks' })
  @IsOptional()
  overdue?: string;

  @ApiPropertyOptional({ description: 'Filter: pending/review tasks' })
  @IsOptional()
  pending?: string;

  @ApiPropertyOptional({ description: 'Filter: tasks with unresolved blocker marker' })
  @IsOptional()
  blocked?: string;
}
