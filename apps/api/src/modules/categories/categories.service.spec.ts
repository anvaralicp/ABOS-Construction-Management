import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;
  let audit: any;
  let mockContext: any;

  beforeEach(async () => {
    prisma = {
      category: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      }
    };

    audit = {
      logEvent: jest.fn(),
    };

    mockContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      permissions: ['categories:read', 'categories:write', 'categories:delete'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('CRUD & Validation', () => {
    it('should create a valid category', async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({ id: 'cat-1', name: 'Labor' });

      const result = await service.create(mockContext, { name: 'Labor' });
      expect(prisma.category.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'Labor', organization_id: 'org-1' })
      }));
      expect(result.id).toEqual('cat-1');
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should reject duplicate name at the same level', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-dup' });
      await expect(service.create(mockContext, { name: 'Labor' })).rejects.toThrow(ConflictException);
    });
  });

  describe('Hierarchy Validation', () => {
    it('should reject self-parenting', async () => {
      await expect(service.update(mockContext, 'cat-1', { parent_id: 'cat-1' })).rejects.toThrow(BadRequestException);
    });

    it('should reject circular hierarchy', async () => {
      // Trying to set parent_id of 'cat-1' to 'cat-2', where 'cat-2' has parent 'cat-1'
      // The update calls validateParentHierarchy which calls findUnique to traverse up
      prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-1', deleted_at: null }); // findOne for the category itself
      
      // inside validateParentHierarchy loop:
      prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-2', parent_id: 'cat-1', is_active: true, deleted_at: null }); // check parent cat-2
      prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-1', parent_id: null, is_active: true, deleted_at: null }); // next parent is cat-1 (circular)

      await expect(service.update(mockContext, 'cat-1', { parent_id: 'cat-2' })).rejects.toThrow(BadRequestException);
    });

    it('should reject inactive parent', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-1', deleted_at: null }); // findOne
      prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-inactive', is_active: false, deleted_at: null }); // validateParent
      await expect(service.update(mockContext, 'cat-1', { parent_id: 'cat-inactive' })).rejects.toThrow(BadRequestException);
    });

    it('should reject cross-tenant parent', async () => {
      prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-1', deleted_at: null }); // findOne
      prisma.category.findUnique.mockResolvedValueOnce(null); // Parent not found in this org context
      await expect(service.update(mockContext, 'cat-1', { parent_id: 'cat-cross-tenant' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('Tenant Isolation', () => {
    it('should scope findOne to organization', async () => {
      prisma.category.findUnique.mockResolvedValue(null); // Not found in this org
      await expect(service.findOne(mockContext, 'cat-2')).rejects.toThrow(NotFoundException);
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id_organization_id: { id: 'cat-2', organization_id: 'org-1' } }
      });
    });
  });

  describe('Deletion Behavior', () => {
    it('should soft-delete when no active children exist', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Cat', deleted_at: null });
      prisma.category.findFirst.mockResolvedValue(null); // No children

      await service.delete(mockContext, 'cat-1');
      expect(prisma.category.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ deleted_at: expect.any(Date) })
      }));
    });

    it('should reject deletion if active children exist', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Cat', deleted_at: null });
      prisma.category.findFirst.mockResolvedValue({ id: 'child-1' }); // Has children

      await expect(service.delete(mockContext, 'cat-1')).rejects.toThrow(BadRequestException);
    });
  });
});
