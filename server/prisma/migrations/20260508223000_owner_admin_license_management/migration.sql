ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS company_id TEXT,
  ADD COLUMN IF NOT EXISTS max_devices INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'CompanyStatus'
  ) THEN
    CREATE TYPE "CompanyStatus" AS ENUM ('active', 'suspended', 'archived');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS companies (
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  notes TEXT,
  status "CompanyStatus" NOT NULL DEFAULT 'active',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS companies_status_idx
ON companies(status);

CREATE INDEX IF NOT EXISTS users_company_id_idx
ON users(company_id);

CREATE INDEX IF NOT EXISTS licenses_company_id_idx
ON licenses(company_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'users_company_id_fkey'
      AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_company_id_fkey
      FOREIGN KEY (company_id)
      REFERENCES companies(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'licenses_company_id_fkey'
      AND table_name = 'licenses'
  ) THEN
    ALTER TABLE licenses
      ADD CONSTRAINT licenses_company_id_fkey
      FOREIGN KEY (company_id)
      REFERENCES companies(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS license_activations (
  id TEXT NOT NULL,
  license_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  app_version TEXT,
  activated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_checked_at TIMESTAMP(3),
  deactivated_at TIMESTAMP(3),
  revoked_at TIMESTAMP(3),

  CONSTRAINT license_activations_pkey PRIMARY KEY (id),
  CONSTRAINT license_activations_license_id_fkey
    FOREIGN KEY (license_id)
    REFERENCES licenses(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS license_activations_license_id_device_id_key
ON license_activations(license_id, device_id);

CREATE INDEX IF NOT EXISTS license_activations_license_id_idx
ON license_activations(license_id);
