import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { CreateOrganizationDto, AddMemberDto, ChangeRoleDto, UpdateOrganizationDto } from './dto/organization.dto';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    // Look up the platform "Organization Admin" role to assign to the creator
    let adminRole = await this.prisma.role.findFirst({
      where: { name: 'Organization Admin', is_system: true },
    });

    if (!adminRole) {
      // Fallback if seed was not run, though it should be.
      throw new NotFoundException('System admin role not found. Cannot create organization.');
    }

    const org = await this.prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: { name: dto.name },
      });

      await tx.organizationSettings.create({
        data: {
          organization_id: newOrg.id,
          timezone: 'UTC',
          currency: 'INR',
          locale: 'en-IN',
          date_format: 'DD/MM/YYYY',
          number_format: 'IN',
          week_start: 'MONDAY',
        }
      });

      await tx.organizationMembership.create({
        data: {
          user_id: userId,
          organization_id: newOrg.id,
          role_id: adminRole.id,
        },
      });

      return newOrg;
    });

    await this.audit.logEvent({ userId, organizationId: org.id } as TenantContext, {
      action: 'ORG_CREATE',
      entityType: 'Organization',
      entityId: org.id,
      metadata: { name: org.name }
    });

    return org;
  }

  async listUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { user_id: userId },
      include: { organization: true, role: true },
    });
    return memberships.map(m => ({
      id: m.organization.id,
      name: m.organization.name,
      status: m.organization.status,
      role: m.role.name,
      membershipId: m.id
    }));
  }

  
  async updateProfile(context: TenantContext, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.update({
      where: { id: context.organizationId },
      data: {
        name: dto.name,
        legal_name: dto.legal_name,
        code: dto.code,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
      }
    });

    await this.audit.logEvent(context, {
      action: 'ORG_PROFILE_UPDATE',
      entityType: 'Organization',
      entityId: org.id,
      metadata: { fields: Object.keys(dto) }
    });

    return org;
  }

  async getOrganization(context: TenantContext) {
    const org = await this.prisma.organization.findUnique({
      where: { id: context.organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async listMembers(context: TenantContext) {
    return this.prisma.organizationMembership.findMany({
      where: { organization_id: context.organizationId },
      include: {
        user: { select: { id: true, email: true, status: true } },
        role: { select: { id: true, name: true } }
      }
    });
  }

  async addMember(context: TenantContext, dto: AddMemberDto) {
    const existing = await this.prisma.organizationMembership.findUnique({
      where: { organization_id_user_id: { organization_id: context.organizationId, user_id: dto.userId } }
    });
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    // Verify role belongs to this org
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new ForbiddenException('Invalid role specified');
    }

    // Explicitly block standard org members from granting system-level roles 
    // unless they hold the platform superadmin permission.
    if (role.is_system && !context.permissions.includes('admin:all')) {
      throw new ForbiddenException('You do not have permission to assign system-level roles.');
    }

    if (role.organization_id && role.organization_id !== context.organizationId) {
      throw new ForbiddenException('Invalid role specified for this organization.');
    }

    const membership = await this.prisma.organizationMembership.create({
      data: {
        organization_id: context.organizationId,
        user_id: dto.userId,
        role_id: dto.roleId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'ORG_MEMBER_ADD',
      entityType: 'OrganizationMembership',
      entityId: membership.id,
      metadata: { targetUserId: dto.userId, roleId: dto.roleId }
    });

    return membership;
  }

  async changeMemberRole(context: TenantContext, memberId: string, dto: ChangeRoleDto) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { id: memberId }
    });
    
    if (!membership || membership.organization_id !== context.organizationId) {
      throw new NotFoundException('Membership not found in this organization');
    }

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new ForbiddenException('Invalid role specified');
    }

    if (role.is_system && !context.permissions.includes('admin:all')) {
      throw new ForbiddenException('You do not have permission to assign system-level roles.');
    }

    if (role.organization_id && role.organization_id !== context.organizationId) {
      throw new ForbiddenException('Invalid role specified for this organization.');
    }

    // Prevent self-escalation (cannot change own role to bypass org bounds)
    if (membership.user_id === context.userId) {
      throw new ForbiddenException('You cannot modify your own role.');
    }

    const updated = await this.prisma.organizationMembership.update({
      where: { id: memberId },
      data: { role_id: dto.roleId }
    });

    await this.audit.logEvent(context, {
      action: 'ORG_MEMBER_ROLE_CHANGE',
      entityType: 'OrganizationMembership',
      entityId: memberId,
      metadata: { oldRoleId: membership.role_id, newRoleId: dto.roleId }
    });

    return updated;
  }

  async removeMember(context: TenantContext, memberId: string) {
    // The canonical model says "No soft delete as per model" for OrganizationMembership.
    // However, removing someone entirely deletes the audit trail for their actions conceptually,
    // though Prisma Restrict prevents deletion if they have created records (e.g., ProjectMember).
    // Let's attempt delete, Prisma will throw if restricted.
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { id: memberId }
    });

    if (!membership || membership.organization_id !== context.organizationId) {
      throw new NotFoundException('Membership not found in this organization');
    }

    if (membership.user_id === context.userId) {
      throw new ForbiddenException('You cannot remove yourself. Use organization leave feature.');
    }

    await this.prisma.organizationMembership.delete({
      where: { id: memberId }
    });

    await this.audit.logEvent(context, {
      action: 'ORG_MEMBER_REMOVE',
      entityType: 'OrganizationMembership',
      entityId: memberId,
      metadata: { targetUserId: membership.user_id }
    });

    return { success: true };
  }
}