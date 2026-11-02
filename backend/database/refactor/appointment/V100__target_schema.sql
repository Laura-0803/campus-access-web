CREATE TABLE IF NOT EXISTS appointments (
 id VARCHAR(64) PRIMARY KEY,visitor_id VARCHAR(64),visitor_name_snapshot VARCHAR(128) NOT NULL,visitor_phone_snapshot VARCHAR(32),visitor_id_no_snapshot VARCHAR(64),
 host_id VARCHAR(64),host_name_snapshot VARCHAR(128) NOT NULL,visit_start DATETIME(3) NOT NULL,visit_end DATETIME(3) NOT NULL,reason TEXT,status VARCHAR(32) NOT NULL,
 created_at DATETIME(3) NOT NULL,reviewed_at DATETIME(3),reviewer_id VARCHAR(64),reviewer_name_snapshot VARCHAR(128),review_comment TEXT,version BIGINT NOT NULL DEFAULT 0,
 issuance_operation_id CHAR(36),issuance_phase VARCHAR(24),qr_id VARCHAR(64),issuance_attempts INT NOT NULL DEFAULT 0,lease_owner CHAR(36),lease_until DATETIME(3),last_error_code VARCHAR(64),hold_reason VARCHAR(64),
 issuance_actor_id VARCHAR(64),issuance_actor_token TEXT,issuance_payload TEXT,issuance_expected_version BIGINT,
 UNIQUE KEY uq_appointment_operation(issuance_operation_id),KEY ix_appointment_host(host_id),KEY ix_appointment_visitor(visitor_id),KEY ix_appointment_status_start(status,visit_start),KEY ix_issuance_recovery(issuance_phase,lease_until),
 CONSTRAINT ck_visit_window CHECK(visit_end>visit_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS appointment_reviews (
 id VARCHAR(64) PRIMARY KEY,appointment_id VARCHAR(64) NOT NULL,decision_version BIGINT NOT NULL,action VARCHAR(32) NOT NULL,before_status VARCHAR(32),after_status VARCHAR(32) NOT NULL,
 actor_id VARCHAR(64),actor_name_snapshot VARCHAR(128),actor_role_snapshot VARCHAR(32),comment TEXT,occurred_at DATETIME(3) NOT NULL,
 audit_payload TEXT,audit_state VARCHAR(24),audit_attempts INT NOT NULL DEFAULT 0,audit_next_retry_at DATETIME(3),audit_last_error_code VARCHAR(64),
 UNIQUE KEY uq_review_version(appointment_id,decision_version),KEY ix_review_time(appointment_id,occurred_at),
 CONSTRAINT fk_review_appointment FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
