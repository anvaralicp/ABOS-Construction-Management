import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async validateParentHierarchy(orgId: string, parentId: string | undefined, categoryId?: string) {
    if (!parentId) return;

    if (categoryId && parentId === categoryId) {
      throw new BadRequestException('A category cannot be its own parent.');
    }

    let currentParentId: string | null = parentId;
    while (currentParentId) {
      if (categoryId && currentParentId === categoryId) {
        throw new BadRequestException('Circular hierarchy detected.');
      }

      const parent = await this.prisma.category.findUnique({
        where: { id_organization_id: { id: currentParentId, organization_id: orgId } }
      });

      if (!parent || parent.deleted_at) {
        throw new BadRequestException('Parent category does not exist or was deleted.');
      }
      
      if (!parent.is_active) {
        throw new BadRequestException('Parent category is inactive.');
      }

      currentParentId = parent.parent_id;
    }
  }

  async create(context: TenantContext, dto: CreateCategoryDto) {
    await this.validateParentHierarchy(context.organizationId, dto.parent_id);

    const existingName = await this.prisma.category.findFirst({
      where: { 
        organization_id: context.organizationId, 
        name: dto.name, 
        parent_id: dto.parent_id || null, 
        deleted_at: null 
      }
    });

    if (existingName) {
      throw new ConflictException('A category with this name already exists at this hierarchy level.');
    }

    const category = await this.prisma.category.create({
      data: {
        ...dto,
        organization_id: context.organizationId,
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: category.id,
      metadata: { name: category.name, parent_id: category.parent_id }
    });

    return category;
  }

  async findAll(context: TenantContext, activeOnly = false) {
    const where: any = { organization_id: context.organizationId, deleted_at: null };
    if (activeOnly) {
      where.is_active = true;
    }
    return this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async getTree(context: TenantContext, activeOnly = false) {
    const categories = await this.findAll(context, activeOnly);
    const categoryMap = new Map();
    const tree = [];

    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach(cat => {
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        categoryMap.get(cat.parent_id).children.push(categoryMap.get(cat.id));
      } else {
        tree.push(categoryMap.get(cat.id));
      }
    });

    return tree;
  }

  async findOne(context: TenantContext, id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id_organization_id: { id, organization_id: context.organizationId } }
    });
    
    if (!category || category.deleted_at) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  async update(context: TenantContext, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(context, id);

    if (dto.parent_id !== undefined && dto.parent_id !== category.parent_id) {
      await this.validateParentHierarchy(context.organizationId, dto.parent_id, id);
    }

    if (dto.name && dto.name !== category.name) {
      const existingName = await this.prisma.category.findFirst({
        where: { 
          organization_id: context.organizationId, 
          name: dto.name, 
          parent_id: dto.parent_id !== undefined ? dto.parent_id : category.parent_id,
          deleted_at: null 
        }
      });
      if (existingName) {
        throw new ConflictException('A category with this name already exists at this hierarchy level.');
      }
    }

    const updated = await this.prisma.category.update({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      data: {
        ...dto,
        updated_by: context.userId,
      }
    });

    const action = dto.is_active === false && category.is_active === true ? 'CATEGORY_DEACTIVATED' :
                   dto.is_active === true && category.is_active === false ? 'CATEGORY_ACTIVATED' :
                   'CATEGORY_UPDATED';

    await this.audit.logEvent(context, {
      action,
      entityType: 'Category',
      entityId: id,
      metadata: dto
    });

    return updated;
  }

  async delete(context: TenantContext, id: string) {
    const category = await this.findOne(context, id);

    // Prevent deletion if it has active child categories
    const children = await this.prisma.category.findFirst({
      where: { parent_id: id, deleted_at: null, organization_id: context.organizationId }
    });

    if (children) {
      throw new BadRequestException('Cannot delete a category that has active subcategories.');
    }

    await this.prisma.category.update({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      data: {
        deleted_at: new Date(),
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'CATEGORY_DELETED',
      entityType: 'Category',
      entityId: id,
      metadata: { name: category.name }
    });

    return { success: true };
  }
}
