package edu.hfut.campus.dao;
import java.util.*;
import edu.hfut.campus.entity.*;
public interface DomainMapper  {
  List<UserEntity> users();
  int updateUser(UserEntity u);
  int createPerson(PersonEntity p);
  int updatePerson(PersonEntity p);
  List<VehicleEntity> vehicles();
  VehicleEntity vehicle(String id);
  int insertVehicle(VehicleEntity v);
  int updateVehicle(VehicleEntity v);
  int deleteVehicle(String id);
  List<FaceEntity> faces();
  int insertFace(FaceEntity f);
  int updateFace(FaceEntity f);
  List<MessageEntity> messages();
  MessageEntity message(String id);
  int insertMessage(MessageEntity m);
  int updateMessage(MessageEntity m);
  int deleteMessage(String id);
  List<AuditEntity> logs();
  int legacyAudit(AuditEntity a);
  int vehicleTime(edu.hfut.campus.dto.LegacyAccessEvent.VehicleTime v);
  int vehicleCount(@org.apache.ibatis.annotations.Param("ownerId")String ownerId,@org.apache.ibatis.annotations.Param("exceptId")String exceptId);
}
