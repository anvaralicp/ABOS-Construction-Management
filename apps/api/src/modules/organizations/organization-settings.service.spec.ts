import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationSettingsService } from './organization-settings.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { WeekStart } from '@prisma/client';

describe('OrganizationSettingsService', () => {
  let service: OrganizationSettingsService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    const mockPrisma = {
      organizationSettings: {
        findUnique: jest.fn(),
        update: jest.fn(),
      }
    };
    const mockAudit = { logEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationSettingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<OrganizationSettingsService>(OrganizationSettingsService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditService>(AuditService);
  });

  const ctx: TenantContext = {
    userId: 'u1',
    organizationId: 'org-1',
    roles: [],
    permissions: []
  };

  describe('getSettings', () => {
    it('should return existing settings', async () => {
      prisma.organizationSettings.findUnique.mockResolvedValue({ id: 's1', timezone: 'Asia/Kolkata' });
      const res = await service.getSettings(ctx);
      expect(res.timezone).toBe('Asia/Kolkata');
    });

    it('should return defensive defaults if no settings found', async () => {
      prisma.organizationSettings.findUnique.mockResolvedValue(null);
      const res = await service.getSettings(ctx);
      expect(res.id).toBe('fallback-id');
      expect(res.timezone).toBe('UTC');
      expect(res.currency).toBe('INR');
    });
  });

  describe('updateSettings', () => {
    it('should throw NotFoundException if settings do not exist', async () => {
      prisma.organizationSettings.findUnique.mockResolvedValue(null);
      await expect(service.updateSettings(ctx, { version: 1 })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if version mismatches', async () => {
      prisma.organizationSettings.findUnique.mockResolvedValue({ version: 2 });
      await expect(service.updateSettings(ctx, { version: 1 })).rejects.toThrow(ConflictException);
    });

    it('should update and increment version', async () => {
      prisma.organizationSettings.findUnique.mockResolvedValue({ version: 1 });
      prisma.organizationSettings.update.mockResolvedValue({ id: 's1', version: 2 });

      await service.updateSettings(ctx, { version: 1, timezone: 'UTC' });

      expect(prisma.organizationSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organization_id: 'org-1', version: 1 },
          data: expect.objectContaining({ timezone: 'UTC', version: { increment: 1 } })
        })
      );
      expect(audit.logEvent).toHaveBeenCalled();
    });
  });

  describe('helpers', () => {
    it('getTimezone should return default UTC if missing', async () => {
      prisma.organizationSettings.findUnique.mockResolvedValue(null);
      const res = await service.getTimezone('org-1');
      expect(res).toBe('UTC');
    });

    it('getCurrency should return config currency', async () => {
      prisma.organizationSettings.findUnique.mockResolvedValue({ currency: 'USD' });
      const res = await service.getCurrency('org-1');
      expect(res).toBe('USD');
    });
  });
});
