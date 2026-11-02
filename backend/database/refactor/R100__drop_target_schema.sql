-- ISOLATED TEST DATABASES ONLY. Select the intended target schema before running.
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS appointment_reviews,appointments;
DROP TABLE IF EXISTS access_records,qr_codes,access_settings,access_rules,devices,gates;
DROP TABLE IF EXISTS blacklist,exceptions;
DROP TABLE IF EXISTS audit_logs,messages,vehicles,faces,auth_tokens,users,people,roles;
SET FOREIGN_KEY_CHECKS=1;
