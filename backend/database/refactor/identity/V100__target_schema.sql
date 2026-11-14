CREATE TABLE IF NOT EXISTS role_definition (
 role_code VARCHAR(32) PRIMARY KEY,label VARCHAR(64) NOT NULL,title VARCHAR(128),avatar_url VARCHAR(512),is_enabled TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS person_profile (
 id VARCHAR(64) PRIMARY KEY,person_code VARCHAR(128),name VARCHAR(128) NOT NULL,person_category VARCHAR(32) NOT NULL,
 identity_number VARCHAR(64),phone VARCHAR(32),college VARCHAR(128),class_name VARCHAR(128),department VARCHAR(128),position VARCHAR(128),
 company VARCHAR(255),graduation_year SMALLINT,major VARCHAR(255),status VARCHAR(32) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uk_person_profile_person_code(person_code),KEY idx_person_profile_category_status(person_category,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS user_account (
 id VARCHAR(64) PRIMARY KEY,username VARCHAR(128) NOT NULL,password_hash VARCHAR(255) NOT NULL,role_code VARCHAR(32) NOT NULL,
 person_id VARCHAR(64),status VARCHAR(32) NOT NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uk_user_account_username(username),KEY idx_user_account_role_status(role_code,status),
 CONSTRAINT fk_user_account_role FOREIGN KEY(role_code) REFERENCES role_definition(role_code),CONSTRAINT fk_user_account_person FOREIGN KEY(person_id) REFERENCES person_profile(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS authentication_token (
 id VARCHAR(128) PRIMARY KEY,token_type VARCHAR(16) NOT NULL,token_digest CHAR(64) NOT NULL,user_id VARCHAR(64),subject VARCHAR(128) NOT NULL,
 purpose VARCHAR(32),issued_at DATETIME(3) NOT NULL,expires_at DATETIME(3) NOT NULL,attempt_count INT NOT NULL DEFAULT 0,consumed_at DATETIME(3),
 UNIQUE KEY uk_authentication_token_digest(token_type,token_digest),UNIQUE KEY uk_authentication_token_subject(token_type,subject,purpose),KEY idx_authentication_token_expiry(expires_at),
 CONSTRAINT fk_authentication_token_user FOREIGN KEY(user_id) REFERENCES user_account(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS biometric_credential (
 id VARCHAR(64) PRIMARY KEY,person_id VARCHAR(64) NOT NULL,slot_code VARCHAR(32) NOT NULL,status VARCHAR(32),file_name VARCHAR(255),image_url LONGTEXT,label VARCHAR(128),updated_at DATETIME(3),
 UNIQUE KEY uk_biometric_credential_person_slot(person_id,slot_code),CONSTRAINT fk_biometric_credential_person FOREIGN KEY(person_id) REFERENCES person_profile(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS registered_vehicle (
 id VARCHAR(64) PRIMARY KEY,owner_id VARCHAR(64) NOT NULL,license_plate_number VARCHAR(32) NOT NULL,status VARCHAR(32) NOT NULL,last_access_at DATETIME(3),
 UNIQUE KEY uk_registered_vehicle_license_plate(license_plate_number),KEY idx_registered_vehicle_owner(owner_id),CONSTRAINT fk_registered_vehicle_owner FOREIGN KEY(owner_id) REFERENCES person_profile(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS notification_message (
 id VARCHAR(64) PRIMARY KEY,title VARCHAR(255) NOT NULL,content TEXT NOT NULL,target_role_code VARCHAR(32) NOT NULL,is_read TINYINT(1) NOT NULL DEFAULT 0,created_at DATETIME(3) NOT NULL,
 KEY idx_notification_message_role_time(target_role_code,created_at),CONSTRAINT fk_notification_message_role FOREIGN KEY(target_role_code) REFERENCES role_definition(role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS audit_log (
 id VARCHAR(64) PRIMARY KEY,occurred_at DATETIME(3) NOT NULL,actor_id VARCHAR(64),actor_name_snapshot VARCHAR(128),actor_role_snapshot VARCHAR(32),action VARCHAR(255) NOT NULL,target VARCHAR(255),result VARCHAR(32) NOT NULL,
 KEY idx_audit_log_occurred_at(occurred_at),KEY idx_audit_log_actor_time(actor_id,occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
