package edu.hfut.access.dao;import java.util.*;import org.apache.ibatis.annotations.*;
public interface EventMapper{
 @Select("SELECT CONCAT('ACCESS-',id) event_id,event_payload payload FROM passage_record WHERE record_type='ACCESS' AND exception_sync_status='PENDING' AND (next_retry_at IS NULL OR next_retry_at<=NOW(3)) LIMIT 20")List<Map<String,Object>>due();
 @Update("UPDATE passage_record SET sync_attempt_count=sync_attempt_count+1,next_retry_at=DATE_ADD(NOW(3),INTERVAL 5 SECOND) WHERE id=SUBSTRING(#{id},8) AND exception_sync_status='PENDING' AND (next_retry_at IS NULL OR next_retry_at<=NOW(3))")int claim(String id);
 @Update("UPDATE passage_record SET exception_sync_status='DELIVERED' WHERE id=SUBSTRING(#{id},8)")int delivered(String id);
 @Update("UPDATE passage_record SET next_retry_at=DATE_ADD(NOW(3),INTERVAL 1 SECOND) WHERE id=SUBSTRING(#{id},8) AND exception_sync_status='PENDING'")int failed(String id);
}
