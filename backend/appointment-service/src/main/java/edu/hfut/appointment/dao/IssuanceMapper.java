package edu.hfut.appointment.dao;import java.util.*;import org.apache.ibatis.annotations.*;
public interface IssuanceMapper{
 @Select("SELECT * FROM appointment_issuance WHERE appointment_id=#{id}")Map<String,Object>one(String id);
 @Select("SELECT * FROM appointment_issuance WHERE operation_id=#{id}")Map<String,Object>operation(String id);
 @Insert("INSERT INTO appointment_issuance(operation_id,appointment_id,actor_id,actor_token,payload,expected_version,phase,hold_reason,attempts)VALUES(#{operationId},#{appointmentId},#{actorId},#{actorToken},#{payload},#{version},'PREPARE',NULL,0)")int insert(Map<String,Object>row);
 @Select("SELECT appointment_id FROM appointment_issuance WHERE phase!='SUCCEEDED' AND hold_reason IS NULL AND (lease_until IS NULL OR lease_until<NOW(3)) LIMIT 20")List<String>due();
 @Update("UPDATE appointment_issuance SET lease_owner=#{owner},lease_until=DATE_ADD(NOW(3),INTERVAL 15 SECOND),attempts=attempts+1 WHERE appointment_id=#{id} AND (lease_until IS NULL OR lease_until<NOW(3))")int claim(@Param("id")String id,@Param("owner")String owner);
 @Update("UPDATE appointment_issuance SET phase=#{phase},qr_id=#{qr},last_error_code=NULL WHERE appointment_id=#{id} AND lease_owner=#{owner}")int phase(@Param("id")String id,@Param("owner")String owner,@Param("phase")String phase,@Param("qr")String qr);
 @Update("UPDATE appointment_issuance SET hold_reason=#{reason},last_error_code=#{reason} WHERE appointment_id=#{id} AND lease_owner=#{owner}")int hold(@Param("id")String id,@Param("owner")String owner,@Param("reason")String reason);
 @Update("UPDATE appointment_issuance SET last_error_code='RESULT_UNKNOWN' WHERE appointment_id=#{id} AND lease_owner=#{owner}")int unknown(@Param("id")String id,@Param("owner")String owner);
 @Update("UPDATE appointment_issuance SET lease_owner=NULL,lease_until=DATE_ADD(NOW(3),INTERVAL 2 SECOND) WHERE appointment_id=#{id} AND lease_owner=#{owner}")int release(@Param("id")String id,@Param("owner")String owner);
}
