import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../core/audit/audit.service';
import * as argon2 from 'argon2';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('User with this email already exists.');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: passwordHash,
      },
      select: { id: true, email: true, status: true, created_at: true },
    });

    // We don't have a full TenantContext yet (no org selected), but we can log the platform-level action
    await this.audit.logEvent({ userId: user.id, organizationId: null } as any, {
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: user.id,
    });

    return user;
  }

  private parseExpiresIn(expiresInStr: string): number {
    const match = expiresInStr.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const val = parseInt(match[1]);
    switch(match[2]) {
      case 's': return val * 1000;
      case 'm': return val * 60 * 1000;
      case 'h': return val * 60 * 60 * 1000;
      case 'd': return val * 24 * 60 * 60 * 1000;
      default: return val * 1000;
    }
  }

  async login(dto: LoginDto, deviceInfo?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials or inactive account.');
    }

    const isMatch = await argon2.verify(user.password_hash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials or inactive account.');
    }

    return this.generateTokens(user.id, user.email, null, null, deviceInfo, ipAddress);
  }

  private async generateTokens(userId: string, email: string, existingSessionId?: string | null, expectedVersion?: number | null, deviceInfo?: string, ipAddress?: string) {
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresMs = this.parseExpiresIn(refreshExpiresIn);
    const expiresAt = new Date(Date.now() + expiresMs);
    
    const refreshTokenHash = await argon2.hash(refreshToken);

    let sessionId = existingSessionId;

    if (existingSessionId && expectedVersion !== undefined && expectedVersion !== null) {
      const result = await this.prisma.userSession.updateMany({
        where: { 
          id: existingSessionId, 
          version: expectedVersion,
          revoked_at: null,
          expires_at: { gt: new Date() }
        },
        data: { 
          refresh_token_hash: refreshTokenHash, 
          expires_at: expiresAt,
          version: { increment: 1 }
        },
      });

      if (result.count === 0) {
        // Token replay, concurrent refresh, or expired/revoked session detected. Revoke completely.
        await this.prisma.userSession.updateMany({
          where: { id: existingSessionId },
          data: { revoked_at: new Date() }
        });
        throw new UnauthorizedException('Security alert: Token replay or concurrent refresh detected. Session revoked.');
      }

      await this.audit.logEvent({ userId, organizationId: null } as any, {
        action: 'SESSION_REFRESHED',
        entityType: 'UserSession',
        entityId: existingSessionId,
      });
    } else {
      const newSession = await this.prisma.userSession.create({
        data: {
          user_id: userId,
          refresh_token_hash: refreshTokenHash,
          expires_at: expiresAt,
          device_info: deviceInfo,
          ip_address: ipAddress,
        },
      });
      sessionId = newSession.id;

      await this.audit.logEvent({ userId, organizationId: null } as any, {
        action: 'SESSION_CREATED',
        entityType: 'UserSession',
        entityId: sessionId,
      });
    }

    const payload = { sub: userId, email, sessionId };
    const accessToken = this.jwtService.sign(payload);

    const refreshJwt = this.jwtService.sign(
      { sub: userId, type: 'refresh', sessionId },
      { secret: refreshToken, expiresIn: refreshExpiresIn }
    );

    const clientRefreshToken = `${refreshToken}.${refreshJwt}`;

    return {
      accessToken,
      refreshToken: clientRefreshToken,
    };
  }

  async refresh(clientRefreshToken: string) {
    const parts = clientRefreshToken.split('.');
    if (parts.length < 2) {
      throw new UnauthorizedException('Invalid refresh token format.');
    }
    const rawSecret = parts[0];
    const jwtToken = parts.slice(1).join('.');

    const decoded: any = this.jwtService.decode(jwtToken);
    if (!decoded || !decoded.sub || decoded.type !== 'refresh' || !decoded.sessionId) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: decoded.sessionId },
      include: { user: true },
    });

    if (!session || session.revoked_at || session.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired session.');
    }
    if (!session.user || session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid refresh token or inactive account.');
    }

    const isValidHash = await argon2.verify(session.refresh_token_hash, rawSecret);
    if (!isValidHash) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    try {
      this.jwtService.verify(jwtToken, { secret: rawSecret });
    } catch (error) {
      throw new UnauthorizedException('Refresh token expired or invalid.');
    }

    return this.generateTokens(session.user.id, session.user.email, session.id, session.version);
  }

  async logout(sessionId: string, userId: string) {
    if (!sessionId) {
      return { success: true };
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revoked_at: new Date() },
    });

    await this.audit.logEvent({ userId, organizationId: null } as any, {
      action: 'SESSION_REVOKED',
      entityType: 'UserSession',
      entityId: sessionId,
    });

    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const isMatch = await argon2.verify(user.password_hash, dto.currentPassword);
    if (!isMatch) throw new UnauthorizedException('Invalid current password.');

    const passwordHash = await argon2.hash(dto.newPassword);
    
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password_hash: passwordHash },
      }),
      this.prisma.userSession.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      })
    ]);

    await this.audit.logEvent({ userId, organizationId: null } as any, {
      action: 'ALL_SESSIONS_REVOKED',
      entityType: 'User',
      entityId: userId,
    });

    return { success: true, message: 'Password updated. Please log in again.' };
  }
}