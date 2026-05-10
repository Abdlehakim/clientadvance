import bcrypt from "bcrypt";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL ?? "admin@demo.com")
  .trim()
  .toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? "admin123";
const DEFAULT_ADMIN_NAME = (process.env.DEFAULT_ADMIN_NAME ?? "Admin Principal").trim();
const DEFAULT_DEMO_ADMIN_ENABLED = process.env.DEFAULT_DEMO_ADMIN_ENABLED === "true";

const DEV_COMPANY_ID = "company_demo";
const DEV_ADMIN_ID = "user_demo_admin";
const DEV_LICENSE_ID = "license_demo";
const DEV_COMPANY_NAME = "Demo";
const DEV_LICENSE_KEY = "GESTION-FACILE-DEMO-2026";

function normalizeLicenseKey(value: string) {
  return value.trim().toUpperCase();
}

function hashLicenseKey(value: string) {
  return createHash("sha256").update(normalizeLicenseKey(value)).digest("hex");
}

function isDemoSeedEnabled() {
  return DEFAULT_DEMO_ADMIN_ENABLED;
}

async function ensureEmptyAdminSettings() {
  await prisma.$executeRaw`
    INSERT INTO admin_settings (
      id,
      admin_email,
      admin_whatsapp,
      updated_at,
      updated_by,
      remote_updated_at
    )
    VALUES (
      ${"settings_default"},
      NULL,
      NULL,
      NOW(),
      NULL,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

async function getDemoAdminId() {
  const user = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
    select: { id: true },
  });

  return user?.id ?? null;
}

async function main() {
  if (!isDemoSeedEnabled()) {
    await ensureEmptyAdminSettings();
    return;
  }

  const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  await prisma.$executeRaw`
    INSERT INTO companies (
      id,
      name,
      contact_email,
      contact_phone,
      notes,
      status,
      created_at,
      updated_at
    )
    VALUES (
      ${DEV_COMPANY_ID},
      ${DEV_COMPANY_NAME},
      ${DEFAULT_ADMIN_EMAIL},
      ${"+212600000000"},
      ${"Development/demo company seed."},
      'active'::"CompanyStatus",
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      contact_email = EXCLUDED.contact_email,
      contact_phone = EXCLUDED.contact_phone,
      notes = EXCLUDED.notes,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;

  await prisma.$executeRaw`
    INSERT INTO users (
      id,
      name,
      email,
      password_hash,
      role,
      is_active,
      company_id,
      created_at,
      updated_at
    )
    VALUES (
      ${DEV_ADMIN_ID},
      ${DEFAULT_ADMIN_NAME},
      ${DEFAULT_ADMIN_EMAIL},
      ${adminPasswordHash},
      'admin'::"Role",
      TRUE,
      ${DEV_COMPANY_ID},
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      company_id = EXCLUDED.company_id,
      updated_at = NOW()
  `;

  const demoAdminId = await getDemoAdminId();

  if (!demoAdminId) {
    throw new Error("Demo admin seed failed.");
  }

  await prisma.adminSettings.upsert({
    where: { id: "settings_default" },
    update: {
      adminEmail: DEFAULT_ADMIN_EMAIL,
      adminWhatsapp: "+212600000000",
      updatedBy: demoAdminId,
      remoteUpdatedAt: new Date(),
    },
    create: {
      id: "settings_default",
      adminEmail: DEFAULT_ADMIN_EMAIL,
      adminWhatsapp: "+212600000000",
      updatedBy: demoAdminId,
      remoteUpdatedAt: new Date(),
    },
  });

  await prisma.$executeRaw`
    INSERT INTO licenses (
      id,
      company_id,
      license_key_hash,
      customer_name,
      status,
      expires_at,
      max_devices,
      created_at,
      updated_at
    )
    VALUES (
      ${DEV_LICENSE_ID},
      ${DEV_COMPANY_ID},
      ${hashLicenseKey(DEV_LICENSE_KEY)},
      ${DEV_COMPANY_NAME},
      'active'::"LicenseStatus",
      NULL,
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT (license_key_hash) DO UPDATE SET
      company_id = EXCLUDED.company_id,
      customer_name = EXCLUDED.customer_name,
      status = EXCLUDED.status,
      expires_at = EXCLUDED.expires_at,
      max_devices = EXCLUDED.max_devices,
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
