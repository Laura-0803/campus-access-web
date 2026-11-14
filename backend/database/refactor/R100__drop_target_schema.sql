-- ISOLATED TEST DATABASES ONLY. Select the intended target schema before running.
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS appointment_review,visit_appointment;
DROP TABLE IF EXISTS passage_record,access_credential,passage_setting,passage_rule,access_device,campus_gate;
DROP TABLE IF EXISTS blacklist_entry,security_incident;
DROP TABLE IF EXISTS audit_log,notification_message,registered_vehicle,biometric_credential,authentication_token,user_account,person_profile,role_definition;
SET FOREIGN_KEY_CHECKS=1;
