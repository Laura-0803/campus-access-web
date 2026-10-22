package edu.hfut.access.service;import java.util.*;
public interface AccessOperations{
 Object list(String token,String table,Map<String,String> query);
 Object create(String token,String table,Map<String,Object> body);
 Object update(String token,String table,String id,Map<String,Object> body,boolean delete);
 Object evaluate(String token,Map<String,Object> body,boolean record,String requestId);
 Object verify(String token,String id,Map<String,Object> body);
}
