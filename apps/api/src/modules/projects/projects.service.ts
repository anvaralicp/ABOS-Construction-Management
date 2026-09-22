import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateProjectDto, UpdateProjectDto, UpdateProjectStatusDto, AddProjectMemberDto } from './dto/project.dto';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private validateDates(start?: Date | string | null, expected?: Date | string | null, actual?: Date | string | null) {
    if (start && expected && new Date(expected) < new Date(start)) {
      throw new BadRequestException('Expected end date cannot be before start date.');
    }
    if (start && actual && new Date(actual) < new Date(start)) {
      throw new BadRequestException('Actual end date cannot be before start date.');
    }
  }

  async create(context: TenantContext, dto: CreateProjectDto) {
    this.validateDates(dto.start_date, dto.expected_end_date, null);

    const existingCode = await this.prisma.project.findFirst({
      where: { organization_id: context.organizationId, code: dto.code, deleted_at: null }
    });
    if (existingCode) {
      throw new ConflictException('Project code already exists in this organization.');
    }

    const project = await this.prisma.project.create({
      data: {
        ...dto,
        organization_id: context.organizationId,
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: project.id,
      metadata: { code: project.code, status: project.status }
    });

    return project;
  }

  async findAll(context: TenantContext) {
    return this.prisma.project.findMany({
      where: { organization_id: context.organizationId, deleted_at: null }
    });
  }

  async findOne(context: TenantContext, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id_organization_id: { id, organization_id: context.organizationId } }
    });
    
    if (!project || project.deleted_at) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(context: TenantContext, id: string, dto: UpdateProjectDto) {
    const project = await this.findOne(context, id);

    this.validateDates(
      dto.start_date !== undefined ? dto.start_date : project.start_date,
      dto.expected_end_date !== undefined ? dto.expected_end_date : project.expected_end_date,
      dto.actual_end_date !== undefined ? dto.actual_end_date : project.actual_end_date
    );

    if (dto.code && dto.code !== project.code) {
      const existingCode = await this.prisma.project.findFirst({
        where: { organization_id: context.organizationId, code: dto.code, deleted_at: null }
      });
      if (existingCode) {
        throw new ConflictException('Project code already exists in this organization.');
      }
    }

    const updated = await this.prisma.project.update({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      data: {
        ...dto,
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: id,
      metadata: dto
    });

    return updated;
  }

  async updateStatus(context: TenantContext, id: string, dto: UpdateProjectStatusDto) {
    const project = await this.findOne(context, id);

    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      [ProjectStatus.DRAFT]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
      [ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
      [ProjectStatus.COMPLETED]: [],
      [ProjectStatus.CANCELLED]: [],
    };

    const allowed = validTransitions[project.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(\`Invalid status transition from \${project.status} to \${dto.status}\`);
    }

    const updated = await this.prisma.project.update({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      data: {
        status: dto.status,
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'PROJECT_STATUS_CHANGED',
      entityType: 'Project',
      entityId: id,
      metadata: { oldStatus: project.status, newStatus: dto.status }
    });

    return updated;
  }

  async delete(context: TenantContext, id: string) {
    const project = await this.findOne(context, id);

    await this.prisma.project.update({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      data: {
        deleted_at: new Date(),
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'PROJECT_DELETED',
      entityType: 'Project',
      entityId: id,
      metadata: {}
    });

    return { success: true };
  }

  async addMember(context: TenantContext, projectId: string, dto: AddProjectMemberDto) {
    const project = await this.findOne(context, projectId);

    const orgMembership = await this.prisma.organizationMembership.findUnique({
      where: { id: dto.organization_membership_id }
    });

    if (!orgMembership || orgMembership.organization_id !== context.organizationId) {
      throw new ForbiddenException('User must belong to the organization to be added to the project.');
    }

    const existing = await this.prisma.projectMember.findFirst({
      where: {
        project_id: projectId,
        organization_membership_id: dto.organization_membership_id,
        organization_id: context.organizationId
      }
    });

    if (existing) {
      throw new ConflictException('User is already a member of this project.');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        project_id: projectId,
        organization_membership_id: dto.organization_membership_id,
        organization_id: context.organizationId
      }
    });

    await this.audit.logEvent(context, {
      action: 'PROJECT_MEMBER_ADDED',
      entityType: 'ProjectMember',
      entityId: member.id,
      metadata: { projectId, organizationMembershipId: dto.organization_membership_id }
    });

    return member;
  }

  async listMembers(context: TenantContext, projectId: string) {
    await this.findOne(context, projectId); // Verify project exists and tenant isolation
    return this.prisma.projectMember.findMany({
      where: { project_id: projectId, organization_id: context.organizationId },
      include: { membership: { include: { user: { select: { id: true, email: true, status: true } } } } }
    });
  }

  async removeMember(context: TenantContext, projectId: string, memberId: string) {
    await this.findOne(context, projectId);

    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, project_id: projectId, organization_id: context.organizationId }
    });

    if (!member) {
      throw new NotFoundException('Project member not found.');
    }

    await this.prisma.projectMember.delete({
      where: { id: member.id }
    });

    await this.audit.logEvent(context, {
      action: 'PROJECT_MEMBER_REMOVED',
      entityType: 'ProjectMember',
      entityId: memberId,
      metadata: { projectId, organizationMembershipId: member.organization_membership_id }
    });

    return { success: true };
  }
}
