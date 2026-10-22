CREATE TABLE IF NOT EXISTS qr_codes (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  token VARCHAR(191) NOT NULL UNIQUE,
  type VARCHAR(32),
  owner_name VARCHAR(128),
  owner_id VARCHAR(64),
  visitor_id VARCHAR(64),
  appointment_id VARCHAR(64),
  valid_from VARCHAR(64),
  valid_to VARCHAR(64),
  status VARCHAR(64),
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_appointment(appointment_id),
  sort_order BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS access_records (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  time VARCHAR(64),
  name VARCHAR(128),
  person_id VARCHAR(64),
  type VARCHAR(64),
  method VARCHAR(128),
  gate VARCHAR(128),
  status VARCHAR(64),
  sort_order BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(128),
  type VARCHAR(64),
  gate VARCHAR(128),
  status VARCHAR(64),
  sort_order BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gates (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(128),
  campus VARCHAR(128),
  location VARCHAR(255),
  open_time VARCHAR(64),
  status VARCHAR(64),
  sort_order BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS access_rules (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  role VARCHAR(32),
  methods TEXT,
  allowed_time VARCHAR(128),
  gates TEXT,
  max_uses VARCHAR(64),
  status VARCHAR(64),
  sort_order BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  gate_open_time VARCHAR(32),
  gate_close_time VARCHAR(32),
  visitor_qr_minutes INT,
  alumni_qr_minutes INT,
  face_threshold DECIMAL(5,2),
  high_risk_auto_block TINYINT(1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS access_requests(request_id VARCHAR(128) PRIMARY KEY,request_digest VARCHAR(64) NOT NULL,response_json MEDIUMTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS access_outbox(event_id VARCHAR(128) PRIMARY KEY,kind VARCHAR(32) NOT NULL,payload MEDIUMTEXT NOT NULL,state VARCHAR(24) NOT NULL,attempts INT NOT NULL DEFAULT 0,next_retry_at DATETIME(3),last_error_code VARCHAR(64),KEY ix_pending(state,next_retry_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;