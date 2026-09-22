import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './dto/expense.dto';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @RequirePermissions('expenses:write')
  @ApiOperation({ summary: 'Create a new expense' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('expenses:read')
  @ApiOperation({ summary: 'List organization expenses with pagination and filtering' })
  async findAll(@CurrentTenant() tenant: TenantContext, @Query() query: ExpenseQueryDto) {
    return this.expensesService.findAll(tenant, query);
  }

  @Get(':id')
  @RequirePermissions('expenses:read')
  @ApiOperation({ summary: 'Get expense details' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.expensesService.findOne(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('expenses:write')
  @ApiOperation({ summary: 'Update expense details' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(tenant, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('expenses:delete')
  @ApiOperation({ summary: 'Archive/Delete an expense' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.expensesService.delete(tenant, id);
  }
}
