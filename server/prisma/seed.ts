import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const employePassword = await bcrypt.hash("employe123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {
      name: "Admin Principal",
      role: Role.admin,
      passwordHash: adminPassword,
      isActive: true,
    },
    create: {
      id: "u_admin_demo",
      email: "admin@demo.com",
      name: "Admin Principal",
      role: Role.admin,
      passwordHash: adminPassword,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "employe@demo.com" },
    update: {
      name: "Employé 1",
      role: Role.employe,
      passwordHash: employePassword,
      isActive: true,
    },
    create: {
      id: "u_employe_demo",
      email: "employe@demo.com",
      name: "Employé 1",
      role: Role.employe,
      passwordHash: employePassword,
      isActive: true,
    },
  });

  await prisma.adminSettings.upsert({
    where: { id: "settings_default" },
    update: {
      adminEmail: admin.email,
      adminWhatsapp: "+212600000000",
      updatedBy: admin.id,
      remoteUpdatedAt: new Date(),
    },
    create: {
      id: "settings_default",
      adminEmail: admin.email,
      adminWhatsapp: "+212600000000",
      updatedBy: admin.id,
      remoteUpdatedAt: new Date(),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
