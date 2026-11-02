CREATE TABLE IF NOT EXISTS exceptions (
 id VARCHAR(64) PRIMARY KEY,source_event_id VARCHAR(128),source_digest CHAR(64),occurred_at DATETIME(3) NOT NULL,person_id VARCHAR(64),person_name_snapshot VARCHAR(128),person_type_snapshot VARCHAR(32),
 gate_id VARCHAR(64),method VARCHAR(32),exception_type VARCHAR(64),reason TEXT,risk VARCHAR(32),status VARCHAR(32) NOT NULL,suggestion TEXT,handler_id VARCHAR(64),handler_name_snapshot VARCHAR(128),
 handled_at DATETIME(3),note TEXT,last_action VARCHAR(128),last_action_note TEXT,last_action_at DATETIME(3),version BIGINT NOT NULL DEFAULT 0,last_request_id VARCHAR(191),last_request_digest CHAR(64),last_response JSON,
 audit_event_id VARCHAR(128),audit_payload JSON,audit_state VARCHAR(24),audit_attempts INT NOT NULL DEFAULT 0,audit_next_retry_at DATETIME(3),
 UNIQUE KEY uq_exception_source(source_event_id),UNIQUE KEY uq_exception_request(last_request_id),KEY ix_exception_status_risk_time(status,risk,occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS blacklist (
 id VARCHAR(64) PRIMARY KEY,credential_type VARCHAR(32),credential_no VARCHAR(128) NOT NULL,person_name_snapshot VARCHAR(128),reason TEXT,status VARCHAR(32) NOT NULL,
 created_at DATETIME(3) NOT NULL,removed_at DATETIME(3),removed_reason TEXT,removed_by_id VARCHAR(64),
 active_credential VARCHAR(128) GENERATED ALWAYS AS(CASE WHEN status IN('生效','有效','启用') THEN credential_no ELSE NULL END) STORED,
 UNIQUE KEY uq_blacklist_active(active_credential),KEY ix_blacklist_credential_status(credential_no,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
