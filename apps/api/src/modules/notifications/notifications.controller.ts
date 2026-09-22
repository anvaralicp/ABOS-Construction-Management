import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, NotificationQueryDto } from './dto/notification.dto';

@ApiTags('Notifications & Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @RequirePermissions('notifications:create')
  @ApiOperation({ summary: 'Create a notification (Admin/Service only)' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'List notifications for current user' })
  async findAll(@CurrentTenant() tenant: TenantContext, @Query() query: NotificationQueryDto) {
    return this.notificationsService.findAll(tenant, query);
  }

  @Get('unread-count')
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentTenant() tenant: TenantContext) {
    return this.notificationsService.getUnreadCount(tenant);
  }

  @Get(':id')
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Get notification by id' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.notificationsService.findOne(tenant, id);
  }

  @Patch('read-all')
  @RequirePermissions('notifications:update')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentTenant() tenant: TenantContext) {
    return this.notificationsService.markAllRead(tenant);
  }

  @Patch(':id/read')
  @RequirePermissions('notifications:update')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.notificationsService.markRead(tenant, id);
  }

  @Patch(':id/unread')
  @RequirePermissions('notifications:update')
  @ApiOperation({ summary: 'Mark notification as unread' })
  async markUnread(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.notificationsService.markUnread(tenant, id);
  }

  @Delete(':id')
  @RequirePermissions('notifications:delete')
  @ApiOperation({ summary: 'Soft delete notification' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.notificationsService.delete(tenant, id);
  }
}
