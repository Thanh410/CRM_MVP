import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { PartialType } from '@nestjs/swagger';

class UpdateProjectDto extends PartialType(CreateProjectDto) {}

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.project.findMany({
      where: { orgId, deletedAt: null },
      include: {
        owner: { select: { id: true, fullName: true, avatar: true } },
        dept: { select: { id: true, name: true } },
        _count: { select: { tasks: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        owner: { select: { id: true, fullName: true, avatar: true } },
        dept: { select: { id: true, name: true } },
        tasks: {
          where: { deletedAt: null, parentId: null },
          include: {
            assignee: { select: { id: true, fullName: true, avatar: true } },
            _count: { select: { subtasks: true, comments: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(orgId: string, userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...dto,
        orgId,
        ownerId: userId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async update(orgId: string, id: string, dto: UpdateProjectDto) {
    await this.findOne(orgId, id);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
