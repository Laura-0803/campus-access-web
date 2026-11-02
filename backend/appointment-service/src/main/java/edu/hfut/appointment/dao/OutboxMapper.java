package edu.hfut.appointment.dao;
import java.util.*;import org.apache.ibatis.annotations.*;
public interface OutboxMapper {
 @Select("SELECT id event_id,audit_payload payload FROM appointment_reviews WHERE audit_state='PENDING' AND (audit_next_retry_at IS NULL OR audit_next_retry_at <= NOW(3)) LIMIT 20") List<Map<String,Object>> due();
 @Update("UPDATE appointment_reviews SET audit_attempts=audit_attempts+1,audit_next_retry_at=DATE_ADD(NOW(3),INTERVAL 10 SECOND) WHERE id=#{id} AND audit_state='PENDING' AND (audit_next_retry_at IS NULL OR audit_next_retry_at <= NOW(3))") int claim(String id);
 @Update("UPDATE appointment_reviews SET audit_state='DELIVERED',audit_last_error_code=NULL WHERE id=#{id}") int delivered(String id);
 @Update("UPDATE appointment_reviews SET audit_last_error_code='REMOTE_UNAVAILABLE' WHERE id=#{id} AND audit_state='PENDING'") int failed(String id);
}
