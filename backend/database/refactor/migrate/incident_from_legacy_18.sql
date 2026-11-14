-- 安全事件域旧 18 表结构迁移到规范 Schema。
-- 将 __SOURCE_INCIDENT_SCHEMA__ 替换为真实源 Schema，并先执行 incident/V100__target_schema.sql。

START TRANSACTION;

INSERT INTO cam_incident_dev.security_incident(
 id,source_event_id,source_digest,occurred_at,person_id,person_name_snapshot,person_category_snapshot,
 gate_id,method,incident_type,reason,risk_level,status,suggestion,handler_id,handler_name_snapshot,
 handled_at,note,last_action,last_action_note,last_action_at,version,last_request_id,last_request_digest,
 last_response,audit_event_id,audit_payload,audit_state,audit_attempt_count,audit_next_retry_at)
SELECT id,source_event_id,source_digest,occurred_at,person_id,person_name_snapshot,person_type_snapshot,
 gate_id,method,exception_type,reason,risk,status,suggestion,handler_id,handler_name_snapshot,
 handled_at,note,last_action,last_action_note,last_action_at,version,last_request_id,last_request_digest,
 last_response,audit_event_id,audit_payload,audit_state,audit_attempts,audit_next_retry_at
FROM __SOURCE_INCIDENT_SCHEMA__.exceptions;

INSERT INTO cam_incident_dev.blacklist_entry(
 id,credential_type,credential_no,person_name_snapshot,reason,status,created_at,removed_at,
 removed_reason,removed_by_id)
SELECT id,credential_type,credential_no,person_name_snapshot,reason,status,created_at,removed_at,
 removed_reason,removed_by_id
FROM __SOURCE_INCIDENT_SCHEMA__.blacklist;

COMMIT;
