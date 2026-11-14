-- 身份域旧 18 表结构迁移到规范 Schema。
-- 执行前：1. 备份源库；2. 将 __SOURCE_IDENTITY_SCHEMA__ 替换为真实源 Schema；3. 先执行 identity/V100__target_schema.sql。
-- 目标 Schema 固定为本机开发环境 cam_identity_dev；测试/演示环境应复制脚本后显式调整。

START TRANSACTION;

INSERT INTO cam_identity_dev.role_definition(role_code,label,title,avatar_url,is_enabled)
SELECT role_key,label,title,avatar_url,enabled FROM __SOURCE_IDENTITY_SCHEMA__.roles;

INSERT INTO cam_identity_dev.person_profile(id,person_code,name,person_category,identity_number,phone,college,class_name,department,position,company,graduation_year,major,status,created_at,updated_at)
SELECT id,person_code,name,person_type,id_number,phone,college,class_name,department,position,company,graduation_year,major,status,created_at,updated_at FROM __SOURCE_IDENTITY_SCHEMA__.people;

INSERT INTO cam_identity_dev.user_account(id,username,password_hash,role_code,person_id,status,created_at,updated_at)
SELECT id,username,password_hash,role_key,person_id,status,created_at,updated_at FROM __SOURCE_IDENTITY_SCHEMA__.users;

INSERT INTO cam_identity_dev.authentication_token(id,token_type,token_digest,user_id,subject,purpose,issued_at,expires_at,attempt_count,consumed_at)
SELECT id,token_type,token_digest,user_id,subject,purpose,issued_at,expires_at,attempts,consumed_at FROM __SOURCE_IDENTITY_SCHEMA__.auth_tokens;

INSERT INTO cam_identity_dev.biometric_credential(id,person_id,slot_code,status,file_name,image_url,label,updated_at)
SELECT id,person_id,slot_key,status,file_name,image_url,label,updated_at FROM __SOURCE_IDENTITY_SCHEMA__.faces;

INSERT INTO cam_identity_dev.registered_vehicle(id,owner_id,license_plate_number,status,last_access_at)
SELECT id,owner_id,plate_no,status,last_access_at FROM __SOURCE_IDENTITY_SCHEMA__.vehicles;

INSERT INTO cam_identity_dev.notification_message(id,title,content,target_role_code,is_read,created_at)
SELECT id,title,content,target_role,read_flag,created_at FROM __SOURCE_IDENTITY_SCHEMA__.messages;

INSERT INTO cam_identity_dev.audit_log(id,occurred_at,actor_id,actor_name_snapshot,actor_role_snapshot,action,target,result)
SELECT id,occurred_at,actor_id,actor_name_snapshot,actor_role_snapshot,action,target,result FROM __SOURCE_IDENTITY_SCHEMA__.audit_logs;

COMMIT;
