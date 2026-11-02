CREATE TABLE IF NOT EXISTS gates (
 id VARCHAR(64) PRIMARY KEY,name VARCHAR(128) NOT NULL,campus VARCHAR(128),location VARCHAR(255),open_from TIME,open_to TIME,status VARCHAR(32) NOT NULL,
 UNIQUE KEY uq_gate_name(name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS devices (
 id VARCHAR(64) PRIMARY KEY,gate_id VARCHAR(64) NOT NULL,name VARCHAR(128) NOT NULL,device_type VARCHAR(32),status VARCHAR(32) NOT NULL,
 UNIQUE KEY uq_device_gate_name(gate_id,name),KEY ix_device_gate_status(gate_id,status),CONSTRAINT fk_device_gate FOREIGN KEY(gate_id) REFERENCES gates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS access_rules (
 id VARCHAR(64) PRIMARY KEY,role_key VARCHAR(32) NOT NULL,method VARCHAR(32) NOT NULL,gate_id VARCHAR(64) NOT NULL,allowed_from TIME,allowed_to TIME,max_uses INT,status VARCHAR(32) NOT NULL,
 UNIQUE KEY uq_rule_atomic(role_key,method,gate_id,allowed_from,allowed_to),KEY ix_rule_role_status(role_key,status),CONSTRAINT fk_rule_gate FOREIGN KEY(gate_id) REFERENCES gates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS access_settings (
 id VARCHAR(32) PRIMARY KEY,visitor_qr_minutes INT NOT NULL,alumni_qr_minutes INT NOT NULL,face_threshold DECIMAL(5,2) NOT NULL,high_risk_auto_block TINYINT(1) NOT NULL,updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS qr_codes (
 id VARCHAR(64) PRIMARY KEY,token VARCHAR(191) NOT NULL,credential_type VARCHAR(32),subject_id VARCHAR(64),subject_name_snapshot VARCHAR(128),appointment_id VARCHAR(64),operation_id CHAR(36),payload_digest VARCHAR(64),
 valid_from DATETIME(3),valid_to DATETIME(3),status VARCHAR(32) NOT NULL,max_uses INT NOT NULL DEFAULT 1,used_count INT NOT NULL DEFAULT 0,issuance_phase VARCHAR(24),
 UNIQUE KEY uq_qr_token(token),UNIQUE KEY uq_qr_appointment(appointment_id),UNIQUE KEY uq_qr_operation(operation_id),KEY ix_qr_status_expiry(status,valid_to),
 CONSTRAINT ck_qr_uses CHECK(used_count>=0 AND max_uses>=0 AND used_count<=max_uses)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS access_records (
 id VARCHAR(128) PRIMARY KEY,record_kind VARCHAR(16) NOT NULL DEFAULT 'ACCESS',request_id VARCHAR(128),request_digest VARCHAR(64),occurred_at DATETIME(3),person_id VARCHAR(64),person_name_snapshot VARCHAR(128),person_type_snapshot VARCHAR(32),
 method VARCHAR(32),gate_id VARCHAR(64),result VARCHAR(32),exception_sync_status VARCHAR(24),sync_attempts INT NOT NULL DEFAULT 0,next_retry_at DATETIME(3),source_response JSON,event_payload JSON,
 UNIQUE KEY uq_access_request(request_id),KEY ix_access_person_time(person_id,occurred_at),KEY ix_access_result_time(result,occurred_at),KEY ix_access_retry(exception_sync_status,next_retry_at),
 CONSTRAINT fk_record_gate FOREIGN KEY(gate_id) REFERENCES gates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
