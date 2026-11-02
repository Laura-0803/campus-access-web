CREATE TABLE IF NOT EXISTS roles (
 role_key VARCHAR(32) PRIMARY KEY,label VARCHAR(64) NOT NULL,title VARCHAR(128),avatar_url VARCHAR(512),enabled TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS people (
 id VARCHAR(64) PRIMARY KEY,person_code VARCHAR(128),name VARCHAR(128) NOT NULL,person_type VARCHAR(32) NOT NULL,
 id_number VARCHAR(64),phone VARCHAR(32),college VARCHAR(128),class_name VARCHAR(128),department VARCHAR(128),position VARCHAR(128),
 company VARCHAR(255),graduation_year SMALLINT,major VARCHAR(255),status VARCHAR(32) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_people_code(person_code),KEY ix_people_type_status(person_type,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS users (
 id VARCHAR(64) PRIMARY KEY,username VARCHAR(128) NOT NULL,password_hash VARCHAR(255) NOT NULL,role_key VARCHAR(32) NOT NULL,
 person_id VARCHAR(64),status VARCHAR(32) NOT NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_users_username(username),KEY ix_users_role_status(role_key,status),
 CONSTRAINT fk_users_role FOREIGN KEY(role_key) REFERENCES roles(role_key),CONSTRAINT fk_users_person FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS auth_tokens (
 id VARCHAR(128) PRIMARY KEY,token_type VARCHAR(16) NOT NULL,token_digest CHAR(64) NOT NULL,user_id VARCHAR(64),subject VARCHAR(128) NOT NULL,
 purpose VARCHAR(32),issued_at DATETIME(3) NOT NULL,expires_at DATETIME(3) NOT NULL,attempts INT NOT NULL DEFAULT 0,consumed_at DATETIME(3),
 UNIQUE KEY uq_auth_digest(token_type,token_digest),UNIQUE KEY uq_auth_subject(token_type,subject,purpose),KEY ix_auth_expiry(expires_at),
 CONSTRAINT fk_auth_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS faces (
 id VARCHAR(64) PRIMARY KEY,person_id VARCHAR(64) NOT NULL,slot_key VARCHAR(32) NOT NULL,status VARCHAR(32),file_name VARCHAR(255),image_url LONGTEXT,label VARCHAR(128),updated_at DATETIME(3),
 UNIQUE KEY uq_face_slot(person_id,slot_key),CONSTRAINT fk_faces_person FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS vehicles (
 id VARCHAR(64) PRIMARY KEY,owner_id VARCHAR(64) NOT NULL,plate_no VARCHAR(32) NOT NULL,status VARCHAR(32) NOT NULL,last_access_at DATETIME(3),
 UNIQUE KEY uq_vehicle_plate(plate_no),KEY ix_vehicle_owner(owner_id),CONSTRAINT fk_vehicles_person FOREIGN KEY(owner_id) REFERENCES people(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS messages (
 id VARCHAR(64) PRIMARY KEY,title VARCHAR(255) NOT NULL,content TEXT NOT NULL,target_role VARCHAR(32) NOT NULL,read_flag TINYINT(1) NOT NULL DEFAULT 0,created_at DATETIME(3) NOT NULL,
 KEY ix_messages_role_time(target_role,created_at),CONSTRAINT fk_messages_role FOREIGN KEY(target_role) REFERENCES roles(role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS audit_logs (
 id VARCHAR(64) PRIMARY KEY,occurred_at DATETIME(3) NOT NULL,actor_id VARCHAR(64),actor_name_snapshot VARCHAR(128),actor_role_snapshot VARCHAR(32),action VARCHAR(255) NOT NULL,target VARCHAR(255),result VARCHAR(32) NOT NULL,
 KEY ix_audit_time(occurred_at),KEY ix_audit_actor(actor_id,occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
