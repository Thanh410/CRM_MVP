import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  avatar: true,
  gender: true,
  jobTitle: true,
  status: true,
  orgId: true,
  deptId: true,
  teamId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  dept: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
  userRoles: { include: { role: { select: { id: true, name: true, displayName: true } } } },
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(orgId: string, dto: CreateUserDto, createdBy?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { orgId, email: dto.email, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Email already in use in this organization');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        orgId,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        gender: dto.gender,
        jobTitle: dto.jobTitle,
        deptId: dto.deptId,
        teamId: dto.teamId,
        status: 'ACTIVE',
      },
      select: USER_SELECT,
    });

    // Assign role if provided
    if (dto.roleId) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: dto.roleId, orgId },
      });
    }

    this.eventEmitter.emit('audit.create', {
      orgId,
      userId: createdBy,
      action: 'CREATE',
      resource: 'users',
      resourceId: user.id,
    });

    return user;
  }

  async findAll(orgId: string, query: PaginationDto) {
    const where = {
      orgId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(data, total, query);
  }

  async findOne(orgId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, orgId, deletedAt: null },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async update(orgId: string, id: string, dto: UpdateUserDto, updatedBy?: string) {
    await this.findOne(orgId, id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.deptId !== undefined && { deptId: dto.deptId }),
        ...(dto.teamId !== undefined && { teamId: dto.teamId }),
      },
      select: USER_SELECT,
    });

    this.eventEmitter.emit('audit.create', {
      orgId,
      userId: updatedBy,
      action: 'UPDATE',
      resource: 'users',
      resourceId: id,
    });

    return user;
  }

  async deactivate(orgId: string, id: string, actorId?: string) {
    await this.findOne(orgId, id);

    await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    this.eventEmitter.emit('audit.create', {
      orgId,
      userId: actorId,
      action: 'UPDATE',
      resource: 'users',
      resourceId: id,
    });
  }

  async remove(orgId: string, id: string, actorId?: string) {
    await this.findOne(orgId, id);

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.eventEmitter.emit('audit.create', {
      orgId,
      userId: actorId,
      action: 'DELETE',
      resource: 'users',
      resourceId: id,
    });
  }
}
