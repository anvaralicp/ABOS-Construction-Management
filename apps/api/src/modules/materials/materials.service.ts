import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateMaterialDto, UpdateMaterialDto, CreateMaterialRateDto, MaterialQueryDto, MaterialRateQueryDto } from './dto/material.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(context: TenantContext, dto: CreateMaterialDto) {
    if (dto.code) {
      const existing = await this.prisma.material.findUnique({
        where: { organization_id_code: { organization_id: context.organizationId, code: dto.code } }
      });
      if (existing) {
        throw new ConflictException('Material code already exists in this organization.');
      }
    }

    const material = await this.prisma.material.create({
      data: {
        organization_id: context.organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        unit_of_measure: dto.unit_of_measure,
        status: dto.status,
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'MATERIAL_CREATED',
      entityType: 'Material',
      entityId: material.id,
      metadata: { name: material.name, code: material.code }
    });

    return material;
  }

  async findAll(context: TenantContext, query: MaterialQueryDto) {
    const { status, search, page = '1', limit = '50' } = query;

    const where: Prisma.MaterialWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
    };

    if (status) where.status = status;
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.material.findMany({
        where,
        take,
        skip,
        orderBy: { name: 'asc' },
      }),
      this.prisma.material.count({ where })
    ]);

    return {
      data: items,
      meta: { total, page: parseInt(page, 10), limit: take, pages: Math.ceil(total / take) }
    };
  }

  async findOne(context: TenantContext, id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
    });

    if (!material || material.deleted_at) {
      throw new NotFoundException('Material not found.');
    }

    return material;
  }

  async update(context: TenantContext, id: string, dto: UpdateMaterialDto) {
    const existing = await this.findOne(context, id);

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.prisma.material.findUnique({
        where: { organization_id_code: { organization_id: context.organizationId, code: dto.code } }
      });
      if (duplicate) {
        throw new ConflictException('Material code already exists in this organization.');
      }
    }

    const updated = await this.prisma.material.update({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      data: {
        name: dto.name !== undefined ? dto.name : existing.name,
        code: dto.code !== undefined ? dto.code : existing.code,
        description: dto.description !== undefined ? dto.description : existing.description,
        unit_of_measure: dto.unit_of_measure !== undefined ? dto.unit_of_measure : existing.unit_of_measure,
        status: dto.status !== undefined ? dto.status : existing.status,
        updated_by: context.userId,
      }
    });

    const action = dto.status !== undefined && dto.status !== existing.status 
      ? (dto.status === 'ACTIVE' ? 'MATERIAL_ACTIVATED' : 'MATERIAL_DEACTIVATED') 
      : 'MATERIAL_UPDATED';

    await this.audit.logEvent(context, {
      action,
      entityType: 'Material',
      entityId: id,
      metadata: { status: updated.status }
    });

    return updated;
  }

  async delete(context: TenantContext, id: string) {
    const material = await this.findOne(context, id);

    await this.prisma.material.update({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      data: {
        deleted_at: new Date(),
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'MATERIAL_DELETED',
      entityType: 'Material',
      entityId: id,
      metadata: { name: material.name }
    });

    return { success: true };
  }

  // --- Material Rates ---

  async createRate(context: TenantContext, materialId: string, dto: CreateMaterialRateDto) {
    const material = await this.findOne(context, materialId);
    
    if (material.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot add a rate to an inactive material.');
    }

    if (dto.vendor_id) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id_organization_id: { id: dto.vendor_id, organization_id: context.organizationId } }
      });
      if (!vendor || vendor.deleted_at || vendor.status !== 'ACTIVE') {
        throw new BadRequestException('Vendor is invalid, inactive, or does not belong to the organization.');
      }
    }

    const rate = await this.prisma.materialRate.create({
      data: {
        organization_id: context.organizationId,
        material_id: materialId,
        vendor_id: dto.vendor_id,
        rate: dto.rate,
        currency: dto.currency,
        effective_date: new Date(dto.effective_date),
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'MATERIAL_RATE_CREATED',
      entityType: 'MaterialRate',
      entityId: rate.id,
      metadata: { materialId, vendor_id: dto.vendor_id, rate: dto.rate }
    });

    return rate;
  }

  async getRates(context: TenantContext, materialId: string, query: MaterialRateQueryDto) {
    await this.findOne(context, materialId); // Ensure material exists and belongs to org

    const { vendor_id, from_date, to_date, page = '1', limit = '50' } = query;

    const where: Prisma.MaterialRateWhereInput = {
      organization_id: context.organizationId,
      material_id: materialId,
    };

    if (vendor_id) where.vendor_id = vendor_id;
    if (from_date || to_date) {
      where.effective_date = {};
      if (from_date) where.effective_date.gte = new Date(from_date);
      if (to_date) where.effective_date.lte = new Date(to_date);
    }

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.materialRate.findMany({
        where,
        take,
        skip,
        orderBy: { effective_date: 'desc' }, // Latest rates first
        include: {
          vendor: { select: { name: true } }
        }
      }),
      this.prisma.materialRate.count({ where })
    ]);

    return {
      data: items,
      meta: { total, page: parseInt(page, 10), limit: take, pages: Math.ceil(total / take) }
    };
  }

  async getLatestRate(context: TenantContext, materialId: string, vendorId?: string) {
    await this.findOne(context, materialId); // Ensure material exists and belongs to org

    const where: Prisma.MaterialRateWhereInput = {
      organization_id: context.organizationId,
      material_id: materialId,
    };

    if (vendorId) {
      where.vendor_id = vendorId;
    }

    const latestRate = await this.prisma.materialRate.findFirst({
      where,
      orderBy: { effective_date: 'desc' },
      include: {
        vendor: { select: { name: true } }
      }
    });

    if (!latestRate) {
      // Empty result instead of exception for 'no rate found'
      return null;
    }

    return latestRate;
  }
}
