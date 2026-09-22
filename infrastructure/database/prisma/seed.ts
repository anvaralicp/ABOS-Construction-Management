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

  const orgAdminRole = await prisma.role.findFirst({
    where: { name: 'Organization Admin', is_system: true, organization_id: null }
  });

  if (!orgAdminRole) {
    await prisma.role.create({
      data: {
        name: 'Organization Admin',
        description: 'Tenant Administrator',
        is_system: true,
      }
    });
    console.log(`Created role: Organization Admin`);
  } else {
    console.log(`Ensured role: Organization Admin`);
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
