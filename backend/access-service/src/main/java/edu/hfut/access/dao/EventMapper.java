package edu.hfut.access.dao;import java.util.*;import org.apache.ibatis.annotations.*;
public interface EventMapper{
 @Select("SELECT event_id,payload FROM access_outbox WHERE state='PENDING' AND (next_retry_at IS NULL OR next_retry_at<=NOW(3)) LIMIT 20")List<Map<String,Object>>due();
 @Update("UPDATE access_outbox SET attempts=attempts+1,next_retry_at=DATE_ADD(NOW(3),INTERVAL 5 SECOND) WHERE event_id=#{id} AND state='PENDING' AND (next_retry_at IS NULL OR next_retry_at<=NOW(3))")int claim(String id);
 @Update("UPDATE access_outbox SET state='DELIVERED',last_error_code=NULL WHERE event_id=#{id}")int delivered(String id);
 @Update("UPDATE access_outbox SET last_error_code='REMOTE_UNAVAILABLE' WHERE event_id=#{id} AND state='PENDING'")int failed(String id);
}
