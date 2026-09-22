import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { VendorStatus } from '@prisma/client';

describe('VendorsService', () => {
  let service: VendorsService;
  let prisma: any;
  let audit: any;
  let mockContext: any;

  beforeEach(async () => {
    prisma = {
      vendor: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      vendorContact: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      }
    };

    audit = {
      logEvent: jest.fn(),
    };

    mockContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      permissions: ['vendors:read', 'vendors:write', 'vendors:delete'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  describe('Vendor CRUD & Validation', () => {
    it('should create a valid vendor', async () => {
      prisma.vendor.findFirst.mockResolvedValue(null);
      prisma.vendor.create.mockResolvedValue({ id: 'ven-1', name: 'Test Vendor' });

      const result = await service.create(mockContext, { name: 'Test Vendor' });
      expect(prisma.vendor.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'Test Vendor', organization_id: 'org-1' })
      }));
      expect(result.id).toEqual('ven-1');
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should reject duplicate vendor code', async () => {
      prisma.vendor.findFirst.mockResolvedValue({ id: 'ven-dup' });
      await expect(service.create(mockContext, { name: 'Test', code: 'DUP' })).rejects.toThrow(ConflictException);
    });

    it('should reject duplicate tax id', async () => {
      prisma.vendor.findFirst.mockResolvedValueOnce(null); // code check
      prisma.vendor.findFirst.mockResolvedValueOnce({ id: 'ven-dup' }); // tax id check
      await expect(service.create(mockContext, { name: 'Test', tax_id: 'TAX1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('Tenant Isolation', () => {
    it('should scope findOne to organization', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null); // Not found in this org
      await expect(service.findOne(mockContext, 'ven-2')).rejects.toThrow(NotFoundException);
      expect(prisma.vendor.findUnique).toHaveBeenCalledWith({
        where: { id_organization_id: { id: 'ven-2', organization_id: 'org-1' } }
      });
    });
  });

  describe('Deletion Behavior', () => {
    it('should soft-delete vendor', async () => {
      prisma.vendor.findUnique.mockResolvedValue({ id: 'ven-1', name: 'Test', deleted_at: null });

      await service.delete(mockContext, 'ven-1');
      expect(prisma.vendor.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ deleted_at: expect.any(Date) })
      }));
    });
  });

  describe('Vendor Contacts', () => {
    it('should create valid contact for existing vendor', async () => {
      prisma.vendor.findUnique.mockResolvedValue({ id: 'ven-1', deleted_at: null });
      prisma.vendorContact.create.mockResolvedValue({ id: 'con-1' });

      const result = await service.createContact(mockContext, 'ven-1', { name: 'John Doe' });
      expect(prisma.vendorContact.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'John Doe', vendor_id: 'ven-1', organization_id: 'org-1' })
      }));
      expect(result.id).toEqual('con-1');
    });

    it('should reject contact creation if vendor belongs to another org', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null); // TenantGuard simulation - findUnique strictly queries by orgId

      await expect(service.createContact(mockContext, 'ven-1', { name: 'John Doe' })).rejects.toThrow(NotFoundException);
    });
  });
});
