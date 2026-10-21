-- Eseguire una sola volta sullo schema esistente, prima di caricare customer.php.
ALTER TABLE customers ADD COLUMN project_name VARCHAR(255) NULL AFTER name;

CREATE TABLE customer_consultations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  message TEXT NOT NULL,
  status ENUM('new', 'in_progress', 'closed') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_consultation_customer (customer_id),
  CONSTRAINT fk_consultation_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Consultazione amministrativa delle richieste (nessuna email automatica):
-- SELECT r.id, r.created_at, r.status, c.name, c.email, c.project_name, r.message
-- FROM customer_consultations r JOIN customers c ON c.id = r.customer_id
-- ORDER BY r.created_at DESC;
