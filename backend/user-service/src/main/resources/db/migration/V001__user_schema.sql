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
  sort_order BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY ux_person_code(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  username VARCHAR(128) NOT NULL UNIQUE,
  account_type VARCHAR(64),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  person_id VARCHAR(64),
  status VARCHAR(64),
  sort_order BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT fk_p2_user_person FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(128) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(32),
  created_at VARCHAR(64),
  expires_at VARCHAR(64),
 INDEX ix_session_user(user_id),
  CONSTRAINT fk_p2_session_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
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
  sort_order BIGINT NOT NULL DEFAULT 0,
 UNIQUE KEY ux_face_slot(person_id,slot_key),
  CONSTRAINT fk_p2_face_person FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  owner_id VARCHAR(64),
  owner_name VARCHAR(128),
  plate_no VARCHAR(64),
  status VARCHAR(64),
  last_access VARCHAR(64),
  sort_order BIGINT NOT NULL DEFAULT 0,
 UNIQUE KEY ux_vehicle_plate(plate_no),
  CONSTRAINT fk_p2_vehicle_person FOREIGN KEY(owner_id) REFERENCES people(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  target_role VARCHAR(255),
  read_flag TINYINT(1),
  created_at VARCHAR(64),
  sort_order BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS logs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  time VARCHAR(64),
  actor VARCHAR(128),
  role VARCHAR(64),
  action VARCHAR(255),
  target VARCHAR(255),
  result VARCHAR(64),
  sort_order BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS verification_codes (purpose VARCHAR(16) NOT NULL,phone VARCHAR(32) NOT NULL,user_id VARCHAR(64),digest CHAR(64) NOT NULL,sent_at BIGINT NOT NULL,expires_at BIGINT NOT NULL,attempts INT NOT NULL DEFAULT 0,PRIMARY KEY(purpose,phone)) ENGINE=InnoDB;
