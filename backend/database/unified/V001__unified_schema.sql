-- Unified local database. Execute against a NEW empty campus_access_dev database.

-- identity
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

-- appointment
CREATE TABLE IF NOT EXISTS visit_appointment (
 id VARCHAR(64) PRIMARY KEY,visitor_id VARCHAR(64),visitor_name_snapshot VARCHAR(128) NOT NULL,visitor_phone_snapshot VARCHAR(32),visitor_identity_number_snapshot VARCHAR(64),
 host_id VARCHAR(64),host_name_snapshot VARCHAR(128) NOT NULL,visit_start DATETIME(3) NOT NULL,visit_end DATETIME(3),reason TEXT,status VARCHAR(32) NOT NULL,
 created_at DATETIME(3) NOT NULL,reviewed_at DATETIME(3),reviewer_id VARCHAR(64),reviewer_name_snapshot VARCHAR(128),review_comment TEXT,version BIGINT NOT NULL DEFAULT 0,
 issuance_operation_id CHAR(36),issuance_phase VARCHAR(24),qr_id VARCHAR(64),issuance_attempt_count INT NOT NULL DEFAULT 0,lease_owner CHAR(36),lease_until DATETIME(3),last_error_code VARCHAR(64),hold_reason VARCHAR(64),
 issuance_actor_id VARCHAR(64),issuance_actor_token TEXT,issuance_payload TEXT,issuance_expected_version BIGINT,
 UNIQUE KEY uk_visit_appointment_issuance_operation(issuance_operation_id),KEY idx_visit_appointment_host(host_id),KEY idx_visit_appointment_visitor(visitor_id),KEY idx_visit_appointment_status_start(status,visit_start),KEY idx_visit_appointment_issuance_recovery(issuance_phase,lease_until),
 CONSTRAINT chk_visit_appointment_time_window CHECK(visit_end>visit_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS appointment_review (
 id VARCHAR(64) PRIMARY KEY,appointment_id VARCHAR(64) NOT NULL,decision_version BIGINT NOT NULL,action VARCHAR(32) NOT NULL,before_status VARCHAR(32),after_status VARCHAR(32) NOT NULL,
 actor_id VARCHAR(64),actor_name_snapshot VARCHAR(128),actor_role_snapshot VARCHAR(32),comment TEXT,occurred_at DATETIME(3) NOT NULL,
 audit_payload TEXT,audit_state VARCHAR(24),audit_attempt_count INT NOT NULL DEFAULT 0,audit_next_retry_at DATETIME(3),audit_last_error_code VARCHAR(64),
 UNIQUE KEY uk_appointment_review_version(appointment_id,decision_version),KEY idx_appointment_review_time(appointment_id,occurred_at),
 CONSTRAINT fk_appointment_review_appointment FOREIGN KEY(appointment_id) REFERENCES visit_appointment(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- passage
CREATE TABLE IF NOT EXISTS campus_gate (
 id VARCHAR(64) PRIMARY KEY,name VARCHAR(128) NOT NULL,campus VARCHAR(128),location VARCHAR(255),open_from TIME,open_to TIME,status VARCHAR(32) NOT NULL,
 UNIQUE KEY uk_campus_gate_name(name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS access_device (
 id VARCHAR(64) PRIMARY KEY,gate_id VARCHAR(64) NOT NULL,name VARCHAR(128) NOT NULL,device_type VARCHAR(32),status VARCHAR(32) NOT NULL,
 UNIQUE KEY uk_access_device_gate_name(gate_id,name),KEY idx_access_device_gate_status(gate_id,status),CONSTRAINT fk_access_device_gate FOREIGN KEY(gate_id) REFERENCES campus_gate(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS passage_rule (
 id VARCHAR(64) PRIMARY KEY,role_code VARCHAR(32) NOT NULL,method VARCHAR(32) NOT NULL,gate_id VARCHAR(64) NOT NULL,allowed_from TIME,allowed_to TIME,maximum_use_count INT,status VARCHAR(32) NOT NULL,
 UNIQUE KEY uk_passage_rule_atomic(role_code,method,gate_id,allowed_from,allowed_to),KEY idx_passage_rule_role_status(role_code,status),CONSTRAINT fk_passage_rule_role FOREIGN KEY(role_code) REFERENCES role_definition(role_code),CONSTRAINT fk_passage_rule_gate FOREIGN KEY(gate_id) REFERENCES campus_gate(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS passage_setting (
 id VARCHAR(32) PRIMARY KEY,visitor_qr_minutes INT NOT NULL,alumni_qr_minutes INT NOT NULL,face_threshold DECIMAL(5,2) NOT NULL,is_high_risk_auto_block_enabled TINYINT(1) NOT NULL,updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS access_credential (
 id VARCHAR(64) PRIMARY KEY,token VARCHAR(191) NOT NULL,credential_type VARCHAR(32),subject_id VARCHAR(64),subject_name_snapshot VARCHAR(128),appointment_id VARCHAR(64),operation_id CHAR(36),payload_digest VARCHAR(64),
 valid_from DATETIME(3),valid_to DATETIME(3),status VARCHAR(32) NOT NULL,maximum_use_count INT NOT NULL DEFAULT 1,used_count INT NOT NULL DEFAULT 0,issuance_phase VARCHAR(24),
 UNIQUE KEY uk_access_credential_token(token),UNIQUE KEY uk_access_credential_appointment(appointment_id),UNIQUE KEY uk_access_credential_operation(operation_id),KEY idx_access_credential_status_expiry(status,valid_to),
 CONSTRAINT chk_access_credential_usage CHECK(used_count>=0 AND maximum_use_count>=0 AND used_count<=maximum_use_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS passage_record (
 id VARCHAR(128) PRIMARY KEY,record_type VARCHAR(16) NOT NULL DEFAULT 'ACCESS',request_id VARCHAR(128),request_digest VARCHAR(64),occurred_at DATETIME(3),person_id VARCHAR(64),person_name_snapshot VARCHAR(128),person_category_snapshot VARCHAR(32),
 method VARCHAR(32),gate_id VARCHAR(64),gate_name_snapshot VARCHAR(128),result VARCHAR(32),exception_sync_status VARCHAR(24),sync_attempt_count INT NOT NULL DEFAULT 0,next_retry_at DATETIME(3),source_response JSON,event_payload JSON,
 UNIQUE KEY uk_passage_record_request(request_id),KEY idx_passage_record_person_time(person_id,occurred_at),KEY idx_passage_record_result_time(result,occurred_at),KEY idx_passage_record_retry(exception_sync_status,next_retry_at),
 CONSTRAINT fk_passage_record_gate FOREIGN KEY(gate_id) REFERENCES campus_gate(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- incident
CREATE TABLE IF NOT EXISTS security_incident (
 id VARCHAR(64) PRIMARY KEY,source_event_id VARCHAR(128),source_digest CHAR(64),occurred_at DATETIME(3) NOT NULL,person_id VARCHAR(64),person_name_snapshot VARCHAR(128),person_category_snapshot VARCHAR(32),
 gate_id VARCHAR(64),gate_name_snapshot VARCHAR(128),method VARCHAR(32),incident_type VARCHAR(64),reason TEXT,risk_level VARCHAR(32),status VARCHAR(32) NOT NULL,suggestion TEXT,handler_id VARCHAR(64),handler_name_snapshot VARCHAR(128),
 handled_at DATETIME(3),note TEXT,last_action VARCHAR(128),last_action_note TEXT,last_action_at DATETIME(3),version BIGINT NOT NULL DEFAULT 0,last_request_id VARCHAR(191),last_request_digest CHAR(64),last_response JSON,
 audit_event_id VARCHAR(128),audit_payload JSON,audit_state VARCHAR(24),audit_attempt_count INT NOT NULL DEFAULT 0,audit_next_retry_at DATETIME(3),
 UNIQUE KEY uk_security_incident_source(source_event_id),UNIQUE KEY uk_security_incident_request(last_request_id),KEY idx_security_incident_status_risk_time(status,risk_level,occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS blacklist_entry (
 id VARCHAR(64) PRIMARY KEY,credential_type VARCHAR(32),credential_no VARCHAR(128) NOT NULL,person_name_snapshot VARCHAR(128),reason TEXT,status VARCHAR(32) NOT NULL,
 created_at DATETIME(3),removed_at DATETIME(3),removed_reason TEXT,removed_by_id VARCHAR(64),
 active_credential VARCHAR(128) GENERATED ALWAYS AS(CASE WHEN status IN('生效','有效','启用') AND credential_no NOT LIKE '%*%' THEN credential_no ELSE NULL END) STORED,
 UNIQUE KEY uk_blacklist_entry_active_credential(active_credential),KEY idx_blacklist_entry_credential_status(credential_no,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

