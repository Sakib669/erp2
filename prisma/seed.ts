import { PrismaClient } from "@prisma/client";
import { seedRbac } from "../src/lib/rbac-seed.ts";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding RBAC permissions and system roles...");
  const result = await seedRbac(prisma);
  console.log(
    `RBAC seed complete: ${result.permissionsCount} permissions, ${result.rolesCount} system roles verified.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
