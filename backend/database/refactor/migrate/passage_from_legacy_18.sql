-- 通行域旧 18 表结构迁移到规范 Schema。
-- 将 __SOURCE_PASSAGE_SCHEMA__ 替换为真实源 Schema，并先执行 passage/V100__target_schema.sql。

START TRANSACTION;

INSERT INTO cam_passage_dev.campus_gate(id,name,campus,location,open_from,open_to,status)
SELECT id,name,campus,location,open_from,open_to,status FROM __SOURCE_PASSAGE_SCHEMA__.gates;

INSERT INTO cam_passage_dev.access_device(id,gate_id,name,device_type,status)
SELECT id,gate_id,name,device_type,status FROM __SOURCE_PASSAGE_SCHEMA__.devices;

INSERT INTO cam_passage_dev.passage_rule(id,role_code,method,gate_id,allowed_from,allowed_to,maximum_use_count,status)
SELECT id,role_key,method,gate_id,allowed_from,allowed_to,max_uses,status FROM __SOURCE_PASSAGE_SCHEMA__.access_rules;

INSERT INTO cam_passage_dev.passage_setting(id,visitor_qr_minutes,alumni_qr_minutes,face_threshold,is_high_risk_auto_block_enabled,updated_at)
SELECT id,visitor_qr_minutes,alumni_qr_minutes,face_threshold,high_risk_auto_block,updated_at FROM __SOURCE_PASSAGE_SCHEMA__.access_settings;

INSERT INTO cam_passage_dev.access_credential(id,token,credential_type,subject_id,subject_name_snapshot,appointment_id,operation_id,payload_digest,valid_from,valid_to,status,maximum_use_count,used_count,issuance_phase)
SELECT id,token,credential_type,subject_id,subject_name_snapshot,appointment_id,operation_id,payload_digest,valid_from,valid_to,status,max_uses,used_count,issuance_phase FROM __SOURCE_PASSAGE_SCHEMA__.qr_codes;

INSERT INTO cam_passage_dev.passage_record(id,record_type,request_id,request_digest,occurred_at,person_id,person_name_snapshot,person_category_snapshot,method,gate_id,result,exception_sync_status,sync_attempt_count,next_retry_at,source_response,event_payload)
SELECT id,record_kind,request_id,request_digest,occurred_at,person_id,person_name_snapshot,person_type_snapshot,method,gate_id,result,exception_sync_status,sync_attempts,next_retry_at,source_response,event_payload FROM __SOURCE_PASSAGE_SCHEMA__.access_records;

COMMIT;
