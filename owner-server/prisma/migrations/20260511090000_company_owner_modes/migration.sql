ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS server_mode TEXT NOT NULL DEFAULT 'without-server',
  ADD COLUMN IF NOT EXISTS notification_delivery_mode TEXT NOT NULL DEFAULT 'desktop-email';

UPDATE companies
SET server_mode = COALESCE(NULLIF(server_mode, ''), 'without-server'),
    notification_delivery_mode = CASE
      WHEN COALESCE(NULLIF(server_mode, ''), 'without-server') = 'with-server'
        THEN 'backend'
      ELSE 'desktop-email'
    END
WHERE server_mode IS NULL
   OR server_mode = ''
   OR notification_delivery_mode IS NULL
   OR notification_delivery_mode = '';
