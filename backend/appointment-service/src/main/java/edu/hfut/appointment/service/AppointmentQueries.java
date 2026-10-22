package edu.hfut.appointment.service;
import java.util.Map;
public interface AppointmentQueries {
 Object list(String token,Map<String,String> query);
 Object hosts(String token);
 Object one(String token,String id);
}
