DO $$
BEGIN
  CREATE TYPE "LicenseStatus" AS ENUM ('active', 'expired', 'revoked', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT NOT NULL,
  license_key_hash TEXT NOT NULL,
  customer_name TEXT,
  status "LicenseStatus" NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT licenses_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS licenses_license_key_hash_key
ON licenses(license_key_hash);

CREATE INDEX IF NOT EXISTS licenses_status_idx
ON licenses(status);
