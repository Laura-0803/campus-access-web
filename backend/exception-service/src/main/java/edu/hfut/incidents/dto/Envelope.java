package edu.hfut.incidents.dto;
import java.util.*;
public final class Envelope {
 private Envelope(){}
 public static Map<String,Object> ok(Object data){Map<String,Object> m=new LinkedHashMap<>();m.put("success",true);m.put("data",data);return m;}
 public static Map<String,Object> list(List<?> data){Map<String,Object> m=ok(data);m.put("total",data.size());return m;}
 public static Map<String,Object> error(String message){Map<String,Object> m=new LinkedHashMap<>(),error=new LinkedHashMap<>();m.put("success",false);error.put("message",message);m.put("error",error);return m;}
}
