CREATE TABLE IF NOT EXISTS appointment_issuance(
 operation_id CHAR(36) PRIMARY KEY,appointment_id VARCHAR(64) NOT NULL UNIQUE,
 actor_id VARCHAR(64) NOT NULL,actor_token TEXT NOT NULL,payload TEXT NOT NULL,
 expected_version BIGINT NOT NULL,phase VARCHAR(24) NOT NULL,qr_id VARCHAR(64),
 hold_reason VARCHAR(64),attempts INT NOT NULL DEFAULT 0,lease_owner CHAR(36),lease_until DATETIME(3),last_error_code VARCHAR(64),
 KEY ix_recovery(phase,hold_reason,lease_until)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
