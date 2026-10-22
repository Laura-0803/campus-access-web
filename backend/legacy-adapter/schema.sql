CREATE TABLE IF NOT EXISTS user_domain_outbox (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  payload JSON NOT NULL,
  state VARCHAR(16) NOT NULL,
  INDEX ix_outbox_state(state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
