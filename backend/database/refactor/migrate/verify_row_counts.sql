-- 迁移后行数核对模板。
-- 将四个 __SOURCE_*_SCHEMA__ 占位符替换为真实源 Schema。
-- 每一行的 source_rows 与 target_rows 必须一致，才能切换应用 JDBC URL。

SELECT 'identity.role_definition' item,
 (SELECT COUNT(*) FROM __SOURCE_IDENTITY_SCHEMA__.roles) source_rows,
 (SELECT COUNT(*) FROM cam_identity_dev.role_definition) target_rows
UNION ALL SELECT 'identity.person_profile',(SELECT COUNT(*) FROM __SOURCE_IDENTITY_SCHEMA__.people),(SELECT COUNT(*) FROM cam_identity_dev.person_profile)
UNION ALL SELECT 'identity.user_account',(SELECT COUNT(*) FROM __SOURCE_IDENTITY_SCHEMA__.users),(SELECT COUNT(*) FROM cam_identity_dev.user_account)
UNION ALL SELECT 'identity.authentication_token',(SELECT COUNT(*) FROM __SOURCE_IDENTITY_SCHEMA__.auth_tokens),(SELECT COUNT(*) FROM cam_identity_dev.authentication_token)
UNION ALL SELECT 'identity.biometric_credential',(SELECT COUNT(*) FROM __SOURCE_IDENTITY_SCHEMA__.faces),(SELECT COUNT(*) FROM cam_identity_dev.biometric_credential)
UNION ALL SELECT 'identity.registered_vehicle',(SELECT COUNT(*) FROM __SOURCE_IDENTITY_SCHEMA__.vehicles),(SELECT COUNT(*) FROM cam_identity_dev.registered_vehicle)
UNION ALL SELECT 'identity.notification_message',(SELECT COUNT(*) FROM __SOURCE_IDENTITY_SCHEMA__.messages),(SELECT COUNT(*) FROM cam_identity_dev.notification_message)
UNION ALL SELECT 'identity.audit_log',(SELECT COUNT(*) FROM __SOURCE_IDENTITY_SCHEMA__.audit_logs),(SELECT COUNT(*) FROM cam_identity_dev.audit_log)
UNION ALL SELECT 'appointment.visit_appointment',(SELECT COUNT(*) FROM __SOURCE_APPOINTMENT_SCHEMA__.appointments),(SELECT COUNT(*) FROM cam_appointment_dev.visit_appointment)
UNION ALL SELECT 'appointment.appointment_review',(SELECT COUNT(*) FROM __SOURCE_APPOINTMENT_SCHEMA__.appointment_reviews),(SELECT COUNT(*) FROM cam_appointment_dev.appointment_review)
UNION ALL SELECT 'passage.campus_gate',(SELECT COUNT(*) FROM __SOURCE_PASSAGE_SCHEMA__.gates),(SELECT COUNT(*) FROM cam_passage_dev.campus_gate)
UNION ALL SELECT 'passage.access_device',(SELECT COUNT(*) FROM __SOURCE_PASSAGE_SCHEMA__.devices),(SELECT COUNT(*) FROM cam_passage_dev.access_device)
UNION ALL SELECT 'passage.passage_rule',(SELECT COUNT(*) FROM __SOURCE_PASSAGE_SCHEMA__.access_rules),(SELECT COUNT(*) FROM cam_passage_dev.passage_rule)
UNION ALL SELECT 'passage.passage_setting',(SELECT COUNT(*) FROM __SOURCE_PASSAGE_SCHEMA__.access_settings),(SELECT COUNT(*) FROM cam_passage_dev.passage_setting)
UNION ALL SELECT 'passage.access_credential',(SELECT COUNT(*) FROM __SOURCE_PASSAGE_SCHEMA__.qr_codes),(SELECT COUNT(*) FROM cam_passage_dev.access_credential)
UNION ALL SELECT 'passage.passage_record',(SELECT COUNT(*) FROM __SOURCE_PASSAGE_SCHEMA__.access_records),(SELECT COUNT(*) FROM cam_passage_dev.passage_record)
UNION ALL SELECT 'incident.security_incident',(SELECT COUNT(*) FROM __SOURCE_INCIDENT_SCHEMA__.exceptions),(SELECT COUNT(*) FROM cam_incident_dev.security_incident)
UNION ALL SELECT 'incident.blacklist_entry',(SELECT COUNT(*) FROM __SOURCE_INCIDENT_SCHEMA__.blacklist),(SELECT COUNT(*) FROM cam_incident_dev.blacklist_entry);
