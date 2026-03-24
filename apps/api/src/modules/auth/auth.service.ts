import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Account is inactive');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(user.id, user.email, user.orgId, roles);

    // Store hashed refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(tokens.refreshToken),
        expiresAt: new Date(
          Date.now() + this.parseExpiry(
            this.configService.get<string>('jwt.refreshExpires', '7d'),
          ),
        ),
        ip,
        userAgent,
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Emit audit event
    this.eventEmitter.emit('audit.create', {
      orgId: user.orgId,
      userId: user.id,
      action: 'LOGIN',
      resource: 'auth',
      ip,
      userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        orgId: user.orgId,
        roles,
      },
    };
  }

  async refresh(rawRefreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) throw new UnauthorizedException();

    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(user.id, user.email, user.orgId, roles);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(tokens.refreshToken),
        expiresAt: new Date(
          Date.now() + this.parseExpiry(
            this.configService.get<string>('jwt.refreshExpires', '7d'),
          ),
        ),
      },
    });

    return tokens;
  }

  async logout(userId: string, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { revoked: true },
      });
    } else {
      // Revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        org: { select: { id: true, name: true, logo: true, slug: true } },
        dept: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new UnauthorizedException();

    const permissions = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissions.add(`${rp.permission.resource}:${rp.permission.action}`);
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      phone: user.phone,
      jobTitle: user.jobTitle,
      orgId: user.orgId,
      org: user.org,
      dept: user.dept,
      roles: user.userRoles.map((ur) => ur.role.name),
      permissions: Array.from(permissions),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, status: 'ACTIVE' },
    });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.' };

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: 'password-reset' },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: '1h',
      },
    );

    // In production, send via email. In dev, log to console.
    const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3001')}/reset-password?token=${resetToken}`;
    console.log(`\n[PASSWORD RESET] ${user.email}\nURL: ${resetUrl}\nToken: ${resetToken}\n`);

    return { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.' };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    if (payload.type !== 'password-reset') {
      throw new BadRequestException('Token không hợp lệ');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash },
    });

    // Revoke all existing refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId: payload.sub, revoked: false },
      data: { revoked: true },
    });

    return { message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại.' };
  }

  // ── Helpers ───────────────────────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
    orgId: string,
    roles: string[],
  ) {
    const payload = { sub: userId, email, orgId, roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.accessExpires', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpires', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 3600 * 1000,
      d: 86400 * 1000,
    };
    return value * (multipliers[unit] ?? 1000);
  }
}
