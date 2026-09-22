import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { ForbiddenException } from '@nestjs/common';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      role: { findFirst: jest.fn(), findUnique: jest.fn() },
      organizationMembership: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(cb => cb(prisma)),
      organization: { create: jest.fn() }
    };
    audit = { logEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  describe('privilege escalation prevention', () => {
    it('should deny organization admin from assigning system role', async () => {
      prisma.organizationMembership.findUnique.mockResolvedValue(null);
      // System role (organization_id is null)
      prisma.role.findUnique.mockResolvedValue({ id: 'sys-role', is_system: true, organization_id: null });

      // Context implies normal org admin without 'admin:all'
      const context: any = { organizationId: 'org1', permissions: ['members:write'] };
      
      await expect(service.addMember(context, { userId: 'u2', roleId: 'sys-role' }))
        .rejects.toThrow('You do not have permission to assign system-level roles.');
    });

    it('should allow platform admin to assign system role if architecture supported it via admin:all', async () => {
      prisma.organizationMembership.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'sys-role', is_system: true, organization_id: null });

      const context: any = { organizationId: 'org1', permissions: ['admin:all'] };
      prisma.organizationMembership.create.mockResolvedValue({ id: 'mem1' });

      const res = await service.addMember(context, { userId: 'u2', roleId: 'sys-role' });
      expect(res.id).toBe('mem1');
    });

    it('should deny self-escalation in changeMemberRole', async () => {
      // User is changing their own role
      const context: any = { userId: 'u1', organizationId: 'org1', permissions: ['members:write'] };
      prisma.organizationMembership.findUnique.mockResolvedValue({ id: 'mem1', user_id: 'u1', organization_id: 'org1' });
      prisma.role.findUnique.mockResolvedValue({ id: 'role1', is_system: false, organization_id: 'org1' });

      await expect(service.changeMemberRole(context, 'mem1', { roleId: 'role1' }))
        .rejects.toThrow('You cannot modify your own role.');
    });

    it('should deny assigning cross-organization role', async () => {
      const context: any = { organizationId: 'org1', permissions: ['members:write'] };
      prisma.role.findUnique.mockResolvedValue({ id: 'role1', is_system: false, organization_id: 'org2' });

      await expect(service.addMember(context, { userId: 'u2', roleId: 'role1' }))
        .rejects.toThrow('Invalid role specified for this organization.');
    });
  });
});
