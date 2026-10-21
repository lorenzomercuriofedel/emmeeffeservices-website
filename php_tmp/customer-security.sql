-- Eseguire una sola volta DOPO customer-registration.sql, prima del PHP nuovo.
ALTER TABLE customers
  ADD COLUMN email_verified_at DATETIME NULL,
  ADD COLUMN email_verification_required TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN privacy_acknowledged_at DATETIME NULL,
  ADD COLUMN terms_accepted_at DATETIME NULL,
  ADD COLUMN legal_version VARCHAR(40) NULL;

-- Compatibilità per gli account già esistenti: nessuna finta data di verifica.
UPDATE customers SET email_verification_required = 0;

CREATE TABLE customer_email_verifications (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  email VARCHAR(254) NOT NULL,
  expires_at DATETIME NOT NULL,
  INDEX idx_email_verification_customer (customer_id),
  CONSTRAINT fk_email_verification_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Manutenzione periodica, dopo aver definito il processo sul server:
-- DELETE FROM customer_email_verifications WHERE expires_at <= UTC_TIMESTAMP();
-- DELETE FROM customer_sessions WHERE expires_at <= UTC_TIMESTAMP();
-- DELETE FROM customers WHERE email_verification_required = 1
--   AND email_verified_at IS NULL AND created_at < UTC_TIMESTAMP() - INTERVAL 7 DAY
--   AND NOT EXISTS (SELECT 1 FROM stazioni_meteo WHERE customer_id = customers.id);
