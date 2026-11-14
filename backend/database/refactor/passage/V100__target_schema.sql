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
 UNIQUE KEY uk_passage_rule_atomic(role_code,method,gate_id,allowed_from,allowed_to),KEY idx_passage_rule_role_status(role_code,status),CONSTRAINT fk_passage_rule_gate FOREIGN KEY(gate_id) REFERENCES campus_gate(id)
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
 method VARCHAR(32),gate_id VARCHAR(64),result VARCHAR(32),exception_sync_status VARCHAR(24),sync_attempt_count INT NOT NULL DEFAULT 0,next_retry_at DATETIME(3),source_response JSON,event_payload JSON,
 UNIQUE KEY uk_passage_record_request(request_id),KEY idx_passage_record_person_time(person_id,occurred_at),KEY idx_passage_record_result_time(result,occurred_at),KEY idx_passage_record_retry(exception_sync_status,next_retry_at),
 CONSTRAINT fk_passage_record_gate FOREIGN KEY(gate_id) REFERENCES campus_gate(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
