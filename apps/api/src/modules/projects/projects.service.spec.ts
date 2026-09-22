import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: any;
  let audit: any;
  let mockContext: any;

  beforeEach(async () => {
    prisma = {
      project: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organizationMembership: {
        findUnique: jest.fn(),
      },
      projectMember: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      }
    };

    audit = {
      logEvent: jest.fn(),
    };

    mockContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      permissions: ['projects:write', 'projects:read', 'projects:delete', 'project_members:write', 'project_members:read'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('Project Creation', () => {
    it('should create a valid project', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue({ id: 'proj-1', code: 'PRJ1', status: ProjectStatus.DRAFT });

      const dto = { name: 'Test', code: 'PRJ1' };
      const result = await service.create(mockContext, dto);

      expect(prisma.project.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ ...dto, organization_id: 'org-1' })
      }));
      expect(result.id).toEqual('proj-1');
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should reject invalid dates', async () => {
      const dto = { name: 'Test', code: 'PRJ1', start_date: '2025-01-02', expected_end_date: '2025-01-01' };
      await expect(service.create(mockContext, dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate code in same org', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'proj-x' });
      await expect(service.create(mockContext, { name: 'Test', code: 'DUP' })).rejects.toThrow(ConflictException);
    });
  });

  describe('Tenant Isolation', () => {
    it('should query strictly by organization boundary', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', deleted_at: null });
      await service.findOne(mockContext, 'proj-1');
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id_organization_id: { id: 'proj-1', organization_id: 'org-1' } }
      });
    });

    it('should throw NotFound if project belongs to another org (since it queries by org id)', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.findOne(mockContext, 'proj-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Lifecycle Status', () => {
    it('should allow valid transitions', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.DRAFT });
      prisma.project.update.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.ACTIVE });

      const result = await service.updateStatus(mockContext, 'proj-1', { status: ProjectStatus.ACTIVE });
      expect(result.status).toEqual(ProjectStatus.ACTIVE);
    });

    it('should reject invalid transitions', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.COMPLETED });
      await expect(service.updateStatus(mockContext, 'proj-1', { status: ProjectStatus.ACTIVE }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Membership', () => {
    it('should reject cross-org membership', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      prisma.organizationMembership.findUnique.mockResolvedValue({ organization_id: 'org-2' }); // Wrong org

      await expect(service.addMember(mockContext, 'proj-1', { organization_membership_id: 'mem-1' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('should add valid member', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      prisma.organizationMembership.findUnique.mockResolvedValue({ id: 'mem-1', organization_id: 'org-1' });
      prisma.projectMember.findFirst.mockResolvedValue(null);
      prisma.projectMember.create.mockResolvedValue({ id: 'pmem-1' });

      const result = await service.addMember(mockContext, 'proj-1', { organization_membership_id: 'mem-1' });
      expect(result.id).toEqual('pmem-1');
    });

    it('should reject duplicate member', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      prisma.organizationMembership.findUnique.mockResolvedValue({ id: 'mem-1', organization_id: 'org-1' });
      prisma.projectMember.findFirst.mockResolvedValue({ id: 'pmem-existing' });

      await expect(service.addMember(mockContext, 'proj-1', { organization_membership_id: 'mem-1' }))
        .rejects.toThrow(ConflictException);
    });
  });
});
