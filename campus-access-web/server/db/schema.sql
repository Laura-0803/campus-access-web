CREATE DATABASE IF NOT EXISTS campus_access
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE campus_access;

CREATE TABLE IF NOT EXISTS roles (
  role_key VARCHAR(32) NOT NULL PRIMARY KEY,
  label VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_profiles (
  role_key VARCHAR(32) NOT NULL PRIMARY KEY,
  person_id VARCHAR(64),
  name VARCHAR(128),
  title VARCHAR(255),
  role_value VARCHAR(32),
  type VARCHAR(64),
  avatar VARCHAR(512),
  status VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  username VARCHAR(128) NOT NULL UNIQUE,
  account_type VARCHAR(64),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  person_id VARCHAR(64),
  status VARCHAR(64),
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS people (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(64),
  code VARCHAR(128),
  id_number VARCHAR(64),
  role VARCHAR(32),
  college VARCHAR(128),
  class_name VARCHAR(128),
  phone VARCHAR(32),
  face_status VARCHAR(64),
  status VARCHAR(64),
  department VARCHAR(128),
  position VARCHAR(128),
  host VARCHAR(128),
  company VARCHAR(255),
  graduation_year VARCHAR(32),
  major VARCHAR(255),
  gate VARCHAR(128),
  sort_order INT NOT NULL DEFAULT 0
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
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  visitor VARCHAR(128),
  visitor_id VARCHAR(64),
  visitor_phone VARCHAR(32),
  id_number VARCHAR(64),
  host VARCHAR(128),
  host_id VARCHAR(64),
  time VARCHAR(64),
  visit_start VARCHAR(64),
  visit_end VARCHAR(64),
  reason TEXT,
  status VARCHAR(64),
  created_at VARCHAR(64),
  reviewed_at VARCHAR(64),
  reviewer VARCHAR(128),
  review_comment TEXT,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exceptions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  time VARCHAR(64),
  person VARCHAR(128),
  person_type VARCHAR(64),
  gate VARCHAR(128),
  method VARCHAR(128),
  type VARCHAR(128),
  reason TEXT,
  risk VARCHAR(64),
  status VARCHAR(64),
  suggestion TEXT,
  handler VARCHAR(128),
  handled_at VARCHAR(64),
  note TEXT,
  actions TEXT,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(128),
  type VARCHAR(64),
  gate VARCHAR(128),
  status VARCHAR(64),
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  owner_id VARCHAR(64),
  owner_name VARCHAR(128),
  plate_no VARCHAR(64),
  status VARCHAR(64),
  last_access VARCHAR(64),
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faces (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  person_id VARCHAR(64),
  person_name VARCHAR(128),
  status VARCHAR(64),
  file_name VARCHAR(255),
  image_url LONGTEXT,
  slot_key VARCHAR(32),
  label VARCHAR(128),
  updated_at VARCHAR(64),
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  sort_order INT NOT NULL DEFAULT 0
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

CREATE TABLE IF NOT EXISTS gates (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(128),
  campus VARCHAR(128),
  location VARCHAR(255),
  open_time VARCHAR(64),
  status VARCHAR(64),
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS access_rules (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  role VARCHAR(32),
  methods TEXT,
  allowed_time VARCHAR(128),
  gates TEXT,
  max_uses VARCHAR(64),
  status VARCHAR(64),
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blacklist (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(128),
  type VARCHAR(128),
  credential_no VARCHAR(128),
  reason TEXT,
  status VARCHAR(64),
  created_at VARCHAR(64),
  removed_at VARCHAR(64),
  removed_reason TEXT,
  removed_by VARCHAR(128),
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS logs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  time VARCHAR(64),
  actor VARCHAR(128),
  role VARCHAR(64),
  action VARCHAR(255),
  target VARCHAR(255),
  result VARCHAR(64),
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  target_role VARCHAR(255),
  read_flag TINYINT(1),
  created_at VARCHAR(64),
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(128) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(32),
  created_at VARCHAR(64),
  expires_at VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD CONSTRAINT fk_users_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE faces
  ADD CONSTRAINT fk_faces_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;

ALTER TABLE vehicles
  ADD CONSTRAINT fk_vehicles_owner FOREIGN KEY (owner_id) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE access_records
  ADD CONSTRAINT fk_records_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_visitor FOREIGN KEY (visitor_id) REFERENCES people(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_appointments_host FOREIGN KEY (host_id) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE qr_codes
  ADD CONSTRAINT fk_qr_owner FOREIGN KEY (owner_id) REFERENCES people(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_qr_visitor FOREIGN KEY (visitor_id) REFERENCES people(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_qr_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
