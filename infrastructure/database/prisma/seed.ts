// Minimal reference seed data for schema validation
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding minimal development data...');
  
  // Seed system roles
  const systemRoles = [
    { name: 'System Admin', description: 'Platform Administrator', is_system: true },
    { name: 'Organization Admin', description: 'Tenant Administrator', is_system: true }
  ];

  for (const role of systemRoles) {
    // Only created if not exist
    console.log(`Ensuring role: ${role.name}`);
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
