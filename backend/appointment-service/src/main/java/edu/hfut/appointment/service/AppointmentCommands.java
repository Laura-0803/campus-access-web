package edu.hfut.appointment.service;
import java.util.Map;
public interface AppointmentCommands {Object create(String token,Map<String,Object> body);Object review(String token,String id,Map<String,Object> body);}
