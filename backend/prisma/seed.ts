import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log(
    "Database connection verified; baseline seed has no application data.",
  );
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
