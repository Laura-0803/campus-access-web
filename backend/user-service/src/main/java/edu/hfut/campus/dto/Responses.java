package edu.hfut.campus.dto;
import java.util.*;
public final class Responses  {
  public static Map<String,Object> profileMap(edu.hfut.campus.entity.RoleProfileEntity p)  {
    return map("personId",p.personId,"name",p.name,"title",p.title,"role",p.role==null||p.role.isEmpty()?p.roleKey:p.role,"type",p.type,"avatar",p.avatar,"status",p.status);
  }
  public static Map<String,Object> map(Object...v)  {
    Map<String,Object> m=new LinkedHashMap<>();
    for(int i=0;i<v.length;i+=2)m.put((String)v[i],v[i+1]);
    return m;
  }
  public static Map<String,Object> ok(Object data)  {
    return map("success",true,"data",data);
  }
  public static String str(Map<String,?> b,String k)  {
    Object v=b.get(k);
    return v==null?"":String.valueOf(v);
  }
}
