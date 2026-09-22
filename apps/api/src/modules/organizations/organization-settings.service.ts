import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { UpdateOrganizationSettingsDto } from './dto/organization-settings.dto';

@Injectable()
export class OrganizationSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getSettings(context: TenantContext) {
    let settings = await this.prisma.organizationSettings.findUnique({
      where: { organization_id: context.organizationId }
    });

    if (!settings) {
      // Defensive fallback. The migration/bootstrap is primary.
      settings = {
        id: 'fallback-id',
        organization_id: context.organizationId,
        timezone: 'UTC',
        currency: 'INR',
        locale: 'en-IN',
        date_format: 'DD/MM/YYYY',
        number_format: 'IN',
        week_start: 'MONDAY',
        version: 0,
        created_at: new Date(),
        updated_at: new Date()
      } as any;
    }

    return settings;
  }

  async updateSettings(context: TenantContext, dto: UpdateOrganizationSettingsDto) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organization_id: context.organizationId }
    });

    if (!settings) {
      throw new NotFoundException('Organization settings not found. Please contact support.');
    }

    if (settings.version !== dto.version) {
      throw new ConflictException('Settings have been modified by another administrator. Please refresh and try again.');
    }

    const { version, ...updateFields } = dto;

    const updated = await this.prisma.organizationSettings.update({
      where: { 
        organization_id: context.organizationId,
        version: dto.version
      },
      data: {
        ...updateFields,
        version: { increment: 1 }
      }
    });

    await this.audit.logEvent(context, {
      action: 'ORG_SETTINGS_UPDATE',
      entityType: 'OrganizationSettings',
      entityId: updated.id,
      metadata: { fields: Object.keys(updateFields) }
    });

    return updated;
  }

  async getTimezone(organizationId: string): Promise<string> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organization_id: organizationId }
    });
    return settings?.timezone || 'UTC';
  }

  async getCurrency(organizationId: string): Promise<string> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organization_id: organizationId }
    });
    return settings?.currency || 'INR';
  }
}
