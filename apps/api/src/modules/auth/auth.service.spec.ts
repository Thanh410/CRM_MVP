import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// ── Mock helpers ──────────────────────────────────────────
const mockUser = {
  id: 'user-1',
  email: 'admin@test.vn',
  fullName: 'Admin User',
  avatar: null,
  phone: null,
  jobTitle: null,
  orgId: 'org-1',
  status: 'ACTIVE',
  passwordHash: '', // set per-test
  lastLoginAt: null,
  deletedAt: null,
  userRoles: [{ role: { name: 'ADMIN' } }],
};

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultVal?: string) => {
    const map: Record<string, string> = {
      'jwt.secret': 'test-secret',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.accessExpires': '15m',
      'jwt.refreshExpires': '7d',
      FRONTEND_URL: 'http://localhost:3001',
    };
    return map[key] ?? defaultVal;
  }),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

// ── Test Suite ────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── login ──────────────────────────────────────────────

  describe('login', () => {
    const dto = { email: 'admin@test.vn', password: 'Password123!' };

    it('returns tokens and user on valid credentials', async () => {
      const hash = await bcrypt.hash('Password123!', 10);
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, passwordHash: hash });
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result.user).toMatchObject({
        id: 'user-1',
        email: 'admin@test.vn',
        roles: ['ADMIN'],
      });
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is INACTIVE', async () => {
      const hash = await bcrypt.hash('Password123!', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        status: 'INACTIVE',
        passwordHash: hash,
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('DifferentPassword', 10);
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, passwordHash: hash });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('stores refresh token hash in DB', async () => {
      const hash = await bcrypt.hash('Password123!', 10);
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, passwordHash: hash });
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      await service.login(dto);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            tokenHash: expect.any(String),
          }),
        }),
      );
    });

    it('emits audit event on successful login', async () => {
      const hash = await bcrypt.hash('Password123!', 10);
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, passwordHash: hash });
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      await service.login(dto, '127.0.0.1', 'TestAgent');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.create', {
        orgId: 'org-1',
        userId: 'user-1',
        action: 'LOGIN',
        resource: 'auth',
        ip: '127.0.0.1',
        userAgent: 'TestAgent',
      });
    });
  });

  // ── logout ─────────────────────────────────────────────

  describe('logout', () => {
    it('revokes a specific refresh token', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1', 'some-refresh-token');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String), userId: 'user-1' },
        data: { revoked: true },
      });
    });

    it('revokes all tokens when no refreshToken passed', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await service.logout('user-1');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revoked: false },
        data: { revoked: true },
      });
    });
  });

  // ── forgotPassword ─────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns success message even when email not found (prevents enumeration)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@test.vn');

      expect(result.message).toContain('email tồn tại');
    });

    it('generates reset token for existing user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'admin@test.vn',
      });
      mockJwtService.signAsync.mockResolvedValue('reset-token-xyz');

      const result = await service.forgotPassword('admin@test.vn');

      expect(result.message).toContain('email tồn tại');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'password-reset' }),
        expect.any(Object),
      );
    });
  });

  // ── resetPassword ──────────────────────────────────────

  describe('resetPassword', () => {
    it('resets password with valid token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'admin@test.vn',
        type: 'password-reset',
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.resetPassword('valid-token', 'NewPassword123!');

      expect(result.message).toContain('đặt lại thành công');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: expect.any(String) },
      });
    });

    it('throws BadRequestException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.resetPassword('bad-token', 'NewPassword123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token type is not password-reset', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        type: 'access',
      });

      await expect(
        service.resetPassword('wrong-type-token', 'NewPassword123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('revokes all refresh tokens after password reset', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        type: 'password-reset',
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.resetPassword('valid-token', 'NewPassword123!');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revoked: false },
        data: { revoked: true },
      });
    });
  });

  // ── me ─────────────────────────────────────────────────

  describe('me', () => {
    it('returns user profile with permissions', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        org: { id: 'org-1', name: 'Test Org', logo: null, slug: 'test-org' },
        dept: null,
        userRoles: [
          {
            role: {
              name: 'ADMIN',
              rolePermissions: [
                { permission: { resource: 'deals', action: 'read' } },
                { permission: { resource: 'deals', action: 'write' } },
              ],
            },
          },
        ],
      });

      const result = await service.me('user-1');

      expect(result).toMatchObject({
        id: 'user-1',
        email: 'admin@test.vn',
        roles: ['ADMIN'],
      });
      expect(result.permissions).toContain('deals:read');
      expect(result.permissions).toContain('deals:write');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.me('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
