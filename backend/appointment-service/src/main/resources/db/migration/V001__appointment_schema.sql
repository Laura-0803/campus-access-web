-- Only a fresh isolated campus_p3_appointment_* schema. No cross-domain FKs or DML.
CREATE TABLE IF NOT EXISTS appointments (
 id VARCHAR(64) NOT NULL PRIMARY KEY, visitor VARCHAR(128), visitor_id VARCHAR(64), visitor_phone VARCHAR(32),
 id_number VARCHAR(64),host VARCHAR(128),host_id VARCHAR(64),time VARCHAR(64),visit_start VARCHAR(64),visit_end VARCHAR(64),
 reason TEXT,status VARCHAR(64),created_at VARCHAR(64),reviewed_at VARCHAR(64),reviewer VARCHAR(128),review_comment TEXT,
 sort_order BIGINT NOT NULL DEFAULT 0,
 INDEX ix_appointment_host(host_id),INDEX ix_appointment_visitor(visitor_id),INDEX ix_appointment_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
