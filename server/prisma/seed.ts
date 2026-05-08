import bcrypt from "bcrypt";
import { createHash } from "crypto";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL ?? "admin@demo.com")
  .trim()
  .toLowerCase();

// Development/demo password only. Override through env when needed.
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? "admin123";
const DEFAULT_ADMIN_NAME = (process.env.DEFAULT_ADMIN_NAME ?? "Admin Principal").trim();
const DEV_LICENSE_KEY = "GESTION-FACILE-DEMO-2026";

function normalizeLicenseKey(value: string) {
  return value.trim().toUpperCase();
}

function hashLicenseKey(value: string) {
  return createHash("sha256").update(normalizeLicenseKey(value)).digest("hex");
}

async function main() {
  const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {
      name: DEFAULT_ADMIN_NAME,
      role: Role.admin,
      passwordHash: adminPasswordHash,
      isActive: true,
    },
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      name: DEFAULT_ADMIN_NAME,
      role: Role.admin,
      passwordHash: adminPasswordHash,
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

  await prisma.$executeRaw`
    INSERT INTO licenses (
      id,
      license_key_hash,
      customer_name,
      status,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (
      ${"license_demo"},
      ${hashLicenseKey(DEV_LICENSE_KEY)},
      ${"Demo"},
      'active'::"LicenseStatus",
      NULL,
      NOW(),
      NOW()
    )
    ON CONFLICT (license_key_hash) DO UPDATE SET
      customer_name = EXCLUDED.customer_name,
      status = EXCLUDED.status,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `;
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
