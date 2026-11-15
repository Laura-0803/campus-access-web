-- One MySQL database; run the schema DDL as administrator, not as a service account.
CREATE DATABASE IF NOT EXISTS campus_access_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Execute backend/database/unified/V001__unified_schema.sql in this database first.
-- Replace each placeholder locally. Never commit real passwords.
CREATE USER 'unified_identity_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_IDENTITY_PASSWORD';
CREATE USER 'unified_appointment_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_APPOINTMENT_PASSWORD';
CREATE USER 'unified_passage_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_PASSAGE_PASSWORD';
CREATE USER 'unified_incident_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_INCIDENT_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON campus_access_dev.* TO 'unified_identity_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON campus_access_dev.* TO 'unified_appointment_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON campus_access_dev.* TO 'unified_passage_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON campus_access_dev.* TO 'unified_incident_app'@'127.0.0.1';
