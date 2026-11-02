package edu.hfut.access.dao;import java.util.*;import org.apache.ibatis.annotations.*;
public interface IssuanceMapper{
 @Select("SELECT operation_id,appointment_id,payload_digest,id qr_id,issuance_phase phase FROM qr_codes WHERE operation_id=#{id}")Map<String,Object>one(String id);
 @Select("SELECT operation_id,appointment_id,payload_digest,id qr_id,issuance_phase phase FROM qr_codes WHERE appointment_id=#{id}")Map<String,Object>appointment(String id);
 @Update("UPDATE qr_codes SET operation_id=#{operationId},payload_digest=#{digest},issuance_phase='PREPARED' WHERE id=#{qrId} AND appointment_id=#{appointmentId} AND operation_id IS NULL")int insert(Map<String,Object>row);
 @Select("SELECT operation_id FROM qr_codes WHERE operation_id=#{id} FOR UPDATE")String lock(String id);
 @Update("UPDATE qr_codes SET issuance_phase='ACTIVE' WHERE operation_id=#{id} AND issuance_phase='PREPARED'")int active(String id);
 default Integer fault(String name){return 0;}
 default int consume(String name){return 0;}
}
