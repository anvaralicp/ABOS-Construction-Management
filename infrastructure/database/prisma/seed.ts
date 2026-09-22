// Minimal reference seed data for schema validation
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding minimal development data...');

  let adminPermission = await prisma.permission.findFirst({
    where: { action: 'admin:all', resource: 'platform' }
  });

  if (!adminPermission) {
    adminPermission = await prisma.permission.create({
      data: { action: 'admin:all', resource: 'platform' }
    });
  }

  console.log(`Ensured permission: admin:all`);

  // 2. Seed System Roles
  const systemAdminRole = await prisma.role.findFirst({
    where: { name: 'Platform Admin', is_system: true, organization_id: null }
  });

  if (!systemAdminRole) {
    await prisma.role.create({
      data: {
        name: 'Platform Admin',
        description: 'Platform Super Administrator',
        is_system: true,
        permissions: {
          connect: { id: adminPermission.id }
        }
      }
    });
    console.log(`Created role: Platform Admin`);
  } else {
    // Ensure permission is attached
    await prisma.role.update({
      where: { id: systemAdminRole.id },
      data: {
        permissions: {
          connect: { id: adminPermission.id }
        }
      }
    });
    console.log(`Ensured role: Platform Admin`);
  }

  const projectPermissions = [
    { action: 'projects:read', resource: 'project' },
    { action: 'projects:write', resource: 'project' },
    { action: 'projects:delete', resource: 'project' },
    { action: 'project_members:read', resource: 'project_member' },
    { action: 'project_members:write', resource: 'project_member' },
    { action: 'categories:read', resource: 'category' },
    { action: 'categories:write', resource: 'category' },
    { action: 'categories:delete', resource: 'category' },
    { action: 'vendors:read', resource: 'vendor' },
    { action: 'vendors:write', resource: 'vendor' },
    { action: 'vendors:delete', resource: 'vendor' },
    { action: 'vendor_contacts:read', resource: 'vendor_contact' },
    { action: 'vendor_contacts:write', resource: 'vendor_contact' },
    { action: 'vendor_contacts:delete', resource: 'vendor_contact' },
    { action: 'expenses:read', resource: 'expense' },
    { action: 'expenses:write', resource: 'expense' },
    { action: 'expenses:delete', resource: 'expense' },
    { action: 'budgets:read', resource: 'budget' },
    { action: 'budgets:write', resource: 'budget' },
    { action: 'budgets:delete', resource: 'budget' },
    { action: 'budgets:summary', resource: 'budget' },
    { action: 'materials:read', resource: 'material' },
    { action: 'materials:write', resource: 'material' },
    { action: 'materials:delete', resource: 'material' },
    { action: 'material_rates:read', resource: 'material_rate' },
    { action: 'material_rates:write', resource: 'material_rate' },
    { action: 'material_rates:delete', resource: 'material_rate' },
    { action: 'workforce:read', resource: 'workforce' },
    { action: 'workforce:write', resource: 'workforce' },
    { action: 'workforce:delete', resource: 'workforce' },
    { action: 'workforce_assignments:read', resource: 'assignment' },
    { action: 'workforce_assignments:write', resource: 'assignment' },
    { action: 'workforce_assignments:delete', resource: 'assignment' },
    { action: 'attendance:read', resource: 'attendance' },
    { action: 'attendance:write', resource: 'attendance' },
    { action: 'attendance:delete', resource: 'attendance' },
    { action: 'vendor_payments:read', resource: 'vendor_payment' },
    { action: 'vendor_payments:write', resource: 'vendor_payment' },
    { action: 'vendor_payments:delete', resource: 'vendor_payment' },
    { action: 'vendor_payments:summary', resource: 'vendor_payment' },
    { action: 'equipment:read', resource: 'equipment' },
    { action: 'equipment:create', resource: 'equipment' },
    { action: 'equipment:update', resource: 'equipment' },
    { action: 'equipment:delete', resource: 'equipment' },
    { action: 'equipment:assign', resource: 'equipment' },
    { action: 'progress_reports:read', resource: 'progress_report' },
    { action: 'progress_reports:create', resource: 'progress_report' },
    { action: 'progress_reports:update', resource: 'progress_report' },
    { action: 'progress_reports:delete', resource: 'progress_report' },
    { action: 'documents:read', resource: 'document' },
    { action: 'documents:create', resource: 'document' },
    { action: 'documents:update', resource: 'document' },
    { action: 'documents:delete', resource: 'document' },
    { action: 'documents:download', resource: 'document' },
  ];

  const orgAdminPermIds = [];
  for (const p of projectPermissions) {
    let perm = await prisma.permission.findFirst({
      where: { action: p.action, resource: p.resource }
    });
    if (!perm) {
      perm = await prisma.permission.create({ data: p });
    }
    orgAdminPermIds.push(perm.id);
  }
  console.log(`Ensured project permissions`);

  const orgAdminRole = await prisma.role.findFirst({
    where: { name: 'Organization Admin', is_system: true, organization_id: null }
  });

  if (!orgAdminRole) {
    await prisma.role.create({
      data: {
        name: 'Organization Admin',
        description: 'Tenant Administrator',
        is_system: true,
        permissions: {
          connect: orgAdminPermIds.map(id => ({ id }))
        }
      }
    });
    console.log(`Created role: Organization Admin`);
  } else {
    await prisma.role.update({
      where: { id: orgAdminRole.id },
      data: {
        permissions: {
          connect: orgAdminPermIds.map(id => ({ id }))
        }
      }
    });
    console.log(`Ensured role: Organization Admin`);
  }

  // 3. Seed Default Categories per Organization
  const organizations = await prisma.organization.findMany();
  const defaultCategories = ['Labor', 'Materials', 'Subcontractor', 'Equipment', 'General & Administrative', 'Permits & Fees'];

  for (const org of organizations) {
    for (const catName of defaultCategories) {
      const existingCat = await prisma.category.findFirst({
        where: { organization_id: org.id, name: catName, parent_id: null }
      });
      if (!existingCat) {
        await prisma.category.create({
          data: {
            organization_id: org.id,
            name: catName,
            is_active: true
          }
        });
      }
    }
    console.log(`Ensured default categories for organization: ${org.id}`);
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
