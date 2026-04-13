import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';

// ── Mock data ─────────────────────────────────────────────
const orgId = 'org-1';
const userId = 'user-1';

const mockTask = {
  id: 'task-1',
  orgId,
  title: 'Fix login bug',
  description: 'Users cannot log in with email',
  status: 'TODO',
  priority: 'HIGH',
  dueDate: new Date('2026-04-10'),
  projectId: 'proj-1',
  assigneeId: userId,
  parentId: null,
  createdBy: userId,
  updatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  assignee: { id: userId, fullName: 'Admin', avatar: null },
  project: { id: 'proj-1', name: 'CRM' },
  watchers: [],
  _count: { subtasks: 0, comments: 2 },
};

const mockComment = {
  id: 'comment-1',
  taskId: 'task-1',
  authorId: userId,
  content: 'Looking into this now',
  createdAt: new Date(),
  author: { id: userId, fullName: 'Admin', avatar: null },
};

// ── Mock Prisma ───────────────────────────────────────────
const mockPrisma = {
  task: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  taskComment: {
    create: jest.fn(),
  },
  taskWatcher: {
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

// ── Test Suite ────────────────────────────────────────────
describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  // ── findAll ────────────────────────────────────────────

  describe('findAll', () => {
    it('returns tasks for an org', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask]);

      const result = await service.findAll(orgId, userId, {} as any);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'task-1', title: 'Fix login bug' });
    });

    it('filters by status', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.findAll(orgId, userId, { status: 'DONE' } as any);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DONE' }),
        }),
      );
    });

    it('filters mine=true uses current userId', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.findAll(orgId, userId, { mine: 'true' } as any);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assigneeId: userId }),
        }),
      );
    });

    it('filters by search term', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.findAll(orgId, userId, { search: 'login' } as any);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'login', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  // ── getKanban ──────────────────────────────────────────

  describe('getKanban', () => {
    it('returns tasks grouped by status columns', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { ...mockTask, status: 'TODO' },
        { ...mockTask, id: 'task-2', status: 'IN_PROGRESS' },
        { ...mockTask, id: 'task-3', status: 'TODO' },
      ]);

      const result = await service.getKanban(orgId);

      expect(result).toHaveLength(4); // TODO, IN_PROGRESS, REVIEW, DONE
      expect(result[0].status).toBe('TODO');
      expect(result[0].tasks).toHaveLength(2);
      expect(result[0].count).toBe(2);
      expect(result[1].status).toBe('IN_PROGRESS');
      expect(result[1].tasks).toHaveLength(1);
      expect(result[2].status).toBe('REVIEW');
      expect(result[2].tasks).toHaveLength(0);
    });
  });

  // ── findOne ────────────────────────────────────────────

  describe('findOne', () => {
    it('returns task with subtasks and comments', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        ...mockTask,
        subtasks: [],
        comments: [mockComment],
      });

      const result = await service.findOne(orgId, 'task-1');

      expect(result).toMatchObject({ id: 'task-1' });
      expect(result.comments).toHaveLength(1);
    });

    it('throws NotFoundException when task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(service.findOne(orgId, 'no-task')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────

  describe('create', () => {
    it('creates a task with watchers', async () => {
      mockPrisma.task.create.mockResolvedValue(mockTask);

      const dto = {
        title: 'New Task',
        status: 'TODO',
        priority: 'MEDIUM',
        watcherIds: ['user-2', 'user-3'],
      };

      const result = await service.create(orgId, userId, dto as any);

      expect(result).toMatchObject({ id: 'task-1' });
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId,
            createdBy: userId,
            watchers: {
              create: [{ userId: 'user-2' }, { userId: 'user-3' }],
            },
          }),
        }),
      );
    });

    it('creates a task without watchers', async () => {
      mockPrisma.task.create.mockResolvedValue(mockTask);

      const result = await service.create(orgId, userId, { title: 'Solo task' } as any);

      expect(result).toMatchObject({ id: 'task-1' });
    });
  });

  // ── update ─────────────────────────────────────────────

  describe('update', () => {
    it('updates task fields', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, subtasks: [], comments: [] });
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, title: 'Updated Task' });

      const result = await service.update(orgId, 'task-1', userId, { title: 'Updated Task' } as any);

      expect(result.title).toBe('Updated Task');
    });

    it('throws NotFoundException when updating nonexistent task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.update(orgId, 'no-task', userId, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── moveStatus ─────────────────────────────────────────

  describe('moveStatus', () => {
    it('changes task status', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, subtasks: [], comments: [] });
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: 'IN_PROGRESS' });

      const result = await service.moveStatus(orgId, 'task-1', 'IN_PROGRESS' as any);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'IN_PROGRESS' },
      });
    });
  });

  // ── addComment ─────────────────────────────────────────

  describe('addComment', () => {
    it('adds a comment to a task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, subtasks: [], comments: [] });
      mockPrisma.taskComment.create.mockResolvedValue(mockComment);

      const result = await service.addComment(orgId, 'task-1', userId, 'Looking into this now');

      expect(result).toMatchObject({ content: 'Looking into this now' });
      expect(mockPrisma.taskComment.create).toHaveBeenCalledWith({
        data: { taskId: 'task-1', authorId: userId, content: 'Looking into this now' },
        include: expect.any(Object),
      });
    });
  });

  // ── watchers ───────────────────────────────────────────

  describe('addWatcher', () => {
    it('adds a watcher if not already watching', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, subtasks: [], comments: [] });
      mockPrisma.taskWatcher.findUnique.mockResolvedValue(null);
      mockPrisma.taskWatcher.create.mockResolvedValue({});

      const result = await service.addWatcher(orgId, 'task-1', 'user-2');

      expect(result.message).toBe('Watcher added');
      expect(mockPrisma.taskWatcher.create).toHaveBeenCalled();
    });

    it('does not duplicate if already watching', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, subtasks: [], comments: [] });
      mockPrisma.taskWatcher.findUnique.mockResolvedValue({ taskId: 'task-1', userId: 'user-2' });

      const result = await service.addWatcher(orgId, 'task-1', 'user-2');

      expect(result.message).toBe('Watcher added');
      expect(mockPrisma.taskWatcher.create).not.toHaveBeenCalled();
    });
  });

  describe('removeWatcher', () => {
    it('removes a watcher', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, subtasks: [], comments: [] });
      mockPrisma.taskWatcher.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.removeWatcher(orgId, 'task-1', 'user-2');

      expect(result.message).toBe('Watcher removed');
    });
  });

  // ── remove ─────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes a task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, subtasks: [], comments: [] });
      mockPrisma.task.update.mockResolvedValue({});

      await service.remove(orgId, 'task-1');

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
