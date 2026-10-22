CREATE TABLE IF NOT EXISTS exceptions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  time VARCHAR(64),
  person VARCHAR(128),
  person_type VARCHAR(64),
  gate VARCHAR(128),
  method VARCHAR(128),
  type VARCHAR(128),
  reason TEXT,
  risk VARCHAR(64),
  status VARCHAR(64),
  suggestion TEXT,
  handler VARCHAR(128),
  handled_at VARCHAR(64),
  note TEXT,
  actions TEXT,
  sort_order BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS blacklist (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(128),
  type VARCHAR(128),
  credential_no VARCHAR(128),
  reason TEXT,
  status VARCHAR(64),
  created_at VARCHAR(64),
  removed_at VARCHAR(64),
  removed_reason TEXT,
  removed_by VARCHAR(128),
  sort_order BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS incident_inbox(event_id VARCHAR(128) PRIMARY KEY, payload_digest CHAR(64) NOT NULL, exception_id VARCHAR(128), received_at VARCHAR(64) NOT NULL);
CREATE TABLE IF NOT EXISTS incident_outbox(event_id VARCHAR(128) PRIMARY KEY,payload LONGTEXT NOT NULL,state VARCHAR(32) NOT NULL DEFAULT 'PENDING',attempts INT NOT NULL DEFAULT 0,next_retry_at BIGINT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS incident_requests(request_id VARCHAR(191) PRIMARY KEY,payload_digest CHAR(64) NOT NULL,response LONGTEXT NOT NULL);
CREATE TABLE IF NOT EXISTS incident_locks(id VARCHAR(32) PRIMARY KEY);
INSERT IGNORE INTO incident_locks(id) VALUES('blacklist');
CREATE TABLE IF NOT EXISTS incident_faults(name VARCHAR(32) PRIMARY KEY,remaining INT NOT NULL DEFAULT 0);
