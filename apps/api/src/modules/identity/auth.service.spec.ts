import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../core/audit/audit.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userSession: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(cb => {
        if (typeof cb === 'function') return cb(prisma);
        return Promise.all(cb);
      })
    };
    jwt = { sign: jest.fn(), verify: jest.fn(), decode: jest.fn() };
    audit = { logEvent: jest.fn() };
    const config = { get: jest.fn().mockReturnValue('7d') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should create independent UserSession and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com', password_hash: 'hashed', status: 'ACTIVE' });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue('hash');
      prisma.userSession.create.mockResolvedValue({ id: 'session1' });
      jwt.sign.mockReturnValue('jwt-token');

      const res = await service.login({ email: 'test@test.com', password: 'password' });
      expect(prisma.userSession.create).toHaveBeenCalled();
      expect(res.accessToken).toBe('jwt-token');
      expect(audit.logEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'SESSION_CREATED' }));
    });
  });

  describe('token refresh', () => {
    it('should rotate token and update existing session', async () => {
      jwt.decode.mockReturnValue({ sub: '1', type: 'refresh', sessionId: 'session1' });
      prisma.userSession.findUnique.mockResolvedValue({ 
        id: 'session1', 
        refresh_token_hash: 'hashed',
        expires_at: new Date(Date.now() + 100000),
        user: { id: '1', status: 'ACTIVE' }
      });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      
      const res = await service.refresh('rawsecret.jwt-token');
      expect(prisma.userSession.update).toHaveBeenCalled();
      expect(audit.logEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'SESSION_REFRESHED' }));
    });

    it('should reject expired session', async () => {
      jwt.decode.mockReturnValue({ sub: '1', type: 'refresh', sessionId: 'session1' });
      prisma.userSession.findUnique.mockResolvedValue({ 
        id: 'session1', 
        expires_at: new Date(Date.now() - 10000), // expired
        user: { id: '1', status: 'ACTIVE' }
      });
      await expect(service.refresh('rawsecret.jwt-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject revoked session', async () => {
      jwt.decode.mockReturnValue({ sub: '1', type: 'refresh', sessionId: 'session1' });
      prisma.userSession.findUnique.mockResolvedValue({ 
        id: 'session1', 
        revoked_at: new Date(), // revoked
        expires_at: new Date(Date.now() + 100000),
        user: { id: '1', status: 'ACTIVE' }
      });
      await expect(service.refresh('rawsecret.jwt-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout/revocation', () => {
    it('should revoke specific session', async () => {
      await service.logout('session1', '1');
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session1' },
        data: { revoked_at: expect.any(Date) },
      });
      expect(audit.logEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'SESSION_REVOKED' }));
    });
  });

  describe('password change', () => {
    it('should update password and revoke all sessions', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', password_hash: 'oldhash' });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue('newhash');

      await service.changePassword('1', { currentPassword: 'old', newPassword: 'new' });
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { user_id: '1', revoked_at: null },
        data: { revoked_at: expect.any(Date) },
      });
      expect(audit.logEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'ALL_SESSIONS_REVOKED' }));
    });
  });
});
