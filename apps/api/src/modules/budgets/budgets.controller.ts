import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto, CreateBudgetLineDto, UpdateBudgetLineDto } from './dto/budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @RequirePermissions('budgets:write')
  @ApiOperation({ summary: 'Create a new budget' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('budgets:read')
  @ApiOperation({ summary: 'List organization budgets' })
  async findAll(@CurrentTenant() tenant: TenantContext) {
    return this.budgetsService.findAll(tenant);
  }

  @Get(':id')
  @RequirePermissions('budgets:read')
  @ApiOperation({ summary: 'Get budget details' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.budgetsService.findOne(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('budgets:write')
  @ApiOperation({ summary: 'Update budget details' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgetsService.update(tenant, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('budgets:delete')
  @ApiOperation({ summary: 'Archive/Delete a budget' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.budgetsService.delete(tenant, id);
  }

  // --- Budget Lines ---

  @Post(':id/lines')
  @RequirePermissions('budgets:write')
  @ApiOperation({ summary: 'Add a budget line' })
  async addLine(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: CreateBudgetLineDto) {
    return this.budgetsService.addLine(tenant, id, dto);
  }

  @Patch(':id/lines/:lineId')
  @RequirePermissions('budgets:write')
  @ApiOperation({ summary: 'Update a budget line' })
  async updateLine(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Param('lineId') lineId: string, @Body() dto: UpdateBudgetLineDto) {
    return this.budgetsService.updateLine(tenant, id, lineId, dto);
  }

  @Delete(':id/lines/:lineId')
  @RequirePermissions('budgets:write') // Requires write permission on budget to delete a line
  @ApiOperation({ summary: 'Delete a budget line' })
  async deleteLine(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Param('lineId') lineId: string) {
    return this.budgetsService.deleteLine(tenant, id, lineId);
  }

  // --- Summary ---

  @Get(':id/summary')
  @RequirePermissions('budgets:summary')
  @ApiOperation({ summary: 'Get budget vs actual summary' })
  async getSummary(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.budgetsService.getSummary(tenant, id);
  }
}
