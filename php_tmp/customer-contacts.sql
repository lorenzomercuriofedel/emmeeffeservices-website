-- Eseguire una volta prima di pubblicare customer.php aggiornato.
-- Email di contatto separata dalla mail privata di accesso; tutto privato per default.
ALTER TABLE customers
  ADD COLUMN contact_email VARCHAR(254) NULL,
  ADD COLUMN website_url VARCHAR(2048) NULL,
  ADD COLUMN contact_email_public TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN website_public TINYINT(1) NOT NULL DEFAULT 0;
