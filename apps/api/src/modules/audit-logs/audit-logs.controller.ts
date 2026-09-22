import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-logs.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

@ApiTags('Audit & Activity Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('organizations/current/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermissions('audit_events:read')
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'List organization audit events (Read-only)' })
  async list(@CurrentTenant() tenant: TenantContext, @Query() query: AuditLogQueryDto) {
    return this.auditLogsService.list(tenant, query);
  }

  @Get(':id')
  @RequirePermissions('audit_events:read')
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Get details of a specific audit event (Read-only)' })
  async getDetail(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogsService.getDetail(tenant, id);
  }
}
