import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateVendorDto, UpdateVendorDto, CreateVendorContactDto, UpdateVendorContactDto } from './dto/vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(context: TenantContext, dto: CreateVendorDto) {
    if (dto.code) {
      const existingCode = await this.prisma.vendor.findFirst({
        where: { organization_id: context.organizationId, code: dto.code }
      });
      if (existingCode) {
        throw new ConflictException('Vendor code already exists in this organization.');
      }
    }

    if (dto.tax_id) {
      const existingTax = await this.prisma.vendor.findFirst({
        where: { organization_id: context.organizationId, tax_id: dto.tax_id }
      });
      if (existingTax) {
        throw new ConflictException('Vendor tax ID already exists in this organization.');
      }
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        ...dto,
        organization_id: context.organizationId,
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'VENDOR_CREATED',
      entityType: 'Vendor',
      entityId: vendor.id,
      metadata: { name: vendor.name, code: vendor.code }
    });

    return vendor;
  }

  async findAll(context: TenantContext) {
    return this.prisma.vendor.findMany({
      where: { organization_id: context.organizationId, deleted_at: null },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(context: TenantContext, id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id_organization_id: { id, organization_id: context.organizationId } }
    });
    
    if (!vendor || vendor.deleted_at) {
      throw new NotFoundException('Vendor not found.');
    }

    return vendor;
  }

  async update(context: TenantContext, id: string, dto: UpdateVendorDto) {
    const vendor = await this.findOne(context, id);

    if (dto.code && dto.code !== vendor.code) {
      const existingCode = await this.prisma.vendor.findFirst({
        where: { organization_id: context.organizationId, code: dto.code }
      });
      if (existingCode) {
        throw new ConflictException('Vendor code already exists in this organization.');
      }
    }

    if (dto.tax_id && dto.tax_id !== vendor.tax_id) {
      const existingTax = await this.prisma.vendor.findFirst({
        where: { organization_id: context.organizationId, tax_id: dto.tax_id }
      });
      if (existingTax) {
        throw new ConflictException('Vendor tax ID already exists in this organization.');
      }
    }

    const updated = await this.prisma.vendor.update({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      data: {
        ...dto,
        updated_by: context.userId,
      }
    });

    const action = dto.status !== undefined && dto.status !== vendor.status 
      ? 'VENDOR_STATUS_CHANGED' 
      : 'VENDOR_UPDATED';

    await this.audit.logEvent(context, {
      action,
      entityType: 'Vendor',
      entityId: id,
      metadata: { ...dto }
    });

    return updated;
  }

  async delete(context: TenantContext, id: string) {
    const vendor = await this.findOne(context, id);

    await this.prisma.vendor.update({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      data: {
        deleted_at: new Date(),
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'VENDOR_DELETED',
      entityType: 'Vendor',
      entityId: id,
      metadata: { name: vendor.name }
    });

    return { success: true };
  }

  // --- Contacts ---

  async listContacts(context: TenantContext, vendorId: string) {
    await this.findOne(context, vendorId); // ensures vendor belongs to the org
    return this.prisma.vendorContact.findMany({
      where: { vendor_id: vendorId, organization_id: context.organizationId, deleted_at: null },
      orderBy: { created_at: 'asc' }
    });
  }

  async createContact(context: TenantContext, vendorId: string, dto: CreateVendorContactDto) {
    await this.findOne(context, vendorId);

    const contact = await this.prisma.vendorContact.create({
      data: {
        ...dto,
        vendor_id: vendorId,
        organization_id: context.organizationId,
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'VENDOR_CONTACT_CREATED',
      entityType: 'VendorContact',
      entityId: contact.id,
      metadata: { vendorId, name: contact.name }
    });

    return contact;
  }

  async updateContact(context: TenantContext, vendorId: string, contactId: string, dto: UpdateVendorContactDto) {
    await this.findOne(context, vendorId);

    const contact = await this.prisma.vendorContact.findFirst({
      where: { id: contactId, vendor_id: vendorId, organization_id: context.organizationId, deleted_at: null }
    });

    if (!contact) {
      throw new NotFoundException('Vendor contact not found.');
    }

    const updated = await this.prisma.vendorContact.update({
      where: { id: contact.id },
      data: {
        ...dto,
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'VENDOR_CONTACT_UPDATED',
      entityType: 'VendorContact',
      entityId: contact.id,
      metadata: { vendorId }
    });

    return updated;
  }

  async deleteContact(context: TenantContext, vendorId: string, contactId: string) {
    await this.findOne(context, vendorId);

    const contact = await this.prisma.vendorContact.findFirst({
      where: { id: contactId, vendor_id: vendorId, organization_id: context.organizationId, deleted_at: null }
    });

    if (!contact) {
      throw new NotFoundException('Vendor contact not found.');
    }

    await this.prisma.vendorContact.update({
      where: { id: contact.id },
      data: {
        deleted_at: new Date(),
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'VENDOR_CONTACT_DELETED',
      entityType: 'VendorContact',
      entityId: contactId,
      metadata: { vendorId, name: contact.name }
    });

    return { success: true };
  }
}
