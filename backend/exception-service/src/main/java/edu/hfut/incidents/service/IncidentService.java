package edu.hfut.incidents.service;import java.util.*;
public interface IncidentService {
 Object query(String token,String id,boolean analysis,Map<String,String>filter);Object chat(String token,Map<String,Object>body);
 Object disposition(String token,String id,Map<String,Object>body,boolean action,String requestKey);
 Object blackList(String token,Map<String,String>q);Object createBlack(String token,Map<String,Object>b);Object updateBlack(String token,String id,Map<String,Object>b);
 Map<String,Object> check(Map<String,Object>b,boolean access);Map<String,Object> accept(Map<String,Object>event);Map<String,Object> projection();
}
