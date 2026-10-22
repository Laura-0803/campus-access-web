package edu.hfut.appointment.dao;
import java.util.*;
import org.apache.ibatis.annotations.Param;
import edu.hfut.appointment.entity.Appointment;
public interface AppointmentMapper {
 List<Appointment> list(Map<String,String> query);
 Appointment one(String id);
 Appointment lock(String id);
 int insert(Appointment a);
 int transition(@Param("a") Appointment a,@Param("before") String before);
 int insertHistory(Map<String,Object> event);
 int insertOutbox(@Param("eventId")String eventId,@Param("appointmentId")String appointmentId,@Param("payload")String payload);
}
