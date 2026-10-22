package edu.hfut.access.dao;import java.util.*;import org.apache.ibatis.annotations.*;
public interface IssuanceMapper{
 @Select("SELECT * FROM qr_issuance WHERE operation_id=#{id}")Map<String,Object>one(String id);
 @Select("SELECT * FROM qr_issuance WHERE appointment_id=#{id}")Map<String,Object>appointment(String id);
 @Insert("INSERT INTO qr_issuance(operation_id,appointment_id,payload_digest,qr_id,phase)VALUES(#{operationId},#{appointmentId},#{digest},#{qrId},'PREPARED')")int insert(Map<String,Object>row);
 @Select("SELECT operation_id FROM qr_issuance WHERE operation_id=#{id} FOR UPDATE")String lock(String id);
 @Update("UPDATE qr_issuance SET phase='ACTIVE' WHERE operation_id=#{id} AND phase='PREPARED'")int active(String id);
 @Select("SELECT remaining FROM p4_faults WHERE name=#{name}")Integer fault(String name);
 @Update("UPDATE p4_faults SET remaining=remaining-1 WHERE name=#{name} AND remaining>0")int consume(String name);
}
