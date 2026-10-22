-- Runner checks information_schema before adding version; only isolated P3 schema.
CREATE TABLE IF NOT EXISTS appointment_review_history (
 event_id VARCHAR(64) PRIMARY KEY, appointment_id VARCHAR(128) NOT NULL,
 action VARCHAR(32) NOT NULL, before_status VARCHAR(32), after_status VARCHAR(32) NOT NULL,
 decision_version BIGINT NOT NULL, actor_id VARCHAR(128), actor_name VARCHAR(255),actor_role VARCHAR(32),
 comment TEXT,occurred_at VARCHAR(32), UNIQUE KEY uq_decision(appointment_id,decision_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS appointment_outbox (
 event_id VARCHAR(64) PRIMARY KEY,appointment_id VARCHAR(128) NOT NULL,payload TEXT NOT NULL,
 state VARCHAR(24) NOT NULL,attempts INT NOT NULL DEFAULT 0,
 next_retry_at DATETIME(3),last_error_code VARCHAR(64),
 KEY ix_pending(state,next_retry_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
