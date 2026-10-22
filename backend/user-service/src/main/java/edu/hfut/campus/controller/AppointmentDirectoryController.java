package edu.hfut.campus.controller;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import edu.hfut.campus.security.*;
import edu.hfut.campus.dao.UserMapper;
import edu.hfut.campus.entity.*;
import edu.hfut.campus.exception.ApiException;
import static edu.hfut.campus.dto.Responses.map;
/** Additive P3-only protected query; all 32 P2 public methods remain unchanged. */
@RestController @ConditionalOnProperty(name="p3.internal.enabled",havingValue="true")
public class AppointmentDirectoryController {
 private final SessionAuthority auth;private final UserMapper dao;
 @Value("${server.port}")int port;
 public AppointmentDirectoryController(SessionAuthority auth,UserMapper dao){this.auth=auth;this.dao=dao;}
 @GetMapping("/internal/appointment-context")public Object context(HttpServletRequest request,@RequestParam(defaultValue="")String visitorId){
  UserEntity user=auth.resolve(Authentication.token(request));
  if(!Arrays.asList("student","teacher","visitor","admin").contains(user.role))throw new ApiException(403,"当前角色无权访问该接口");
  PersonEntity person=dao.person(user.personId);if(person==null&&!"admin".equals(user.role))throw new ApiException(403,"账号未关联有效人员档案");
  List<Object> hosts=new ArrayList<>();for(PersonEntity h:dao.people())if(Arrays.asList("student","teacher","admin").contains(h.role))hosts.add(map("id",h.id,"name",h.name,"role",h.role,"type",h.type,"code",h.code,"department",notEmpty(h.department)?h.department:notEmpty(h.college)?h.college:h.gate==null?"":h.gate));
  PersonEntity scoped="visitor".equals(user.role)?person:"admin".equals(user.role)&&!visitorId.isEmpty()?dao.person(visitorId):null;
  return map("actor",map("id",user.id,"username",user.username,"role",user.role,"personId",user.personId,"personName",person==null?null:person.name,"phone",person==null?null:person.phone),"hosts",hosts,"visitorScope",scoped==null?null:map("name",scoped.name,"phone",scoped.phone),"servedBy",port);
 }
 @PostMapping("/internal/appointment-resolve")public Object resolve(HttpServletRequest request,@RequestBody Map<String,Object> body){
  UserEntity user=auth.resolve(Authentication.token(request));String action=String.valueOf(body.get("action"));
  List<String> allowed="create".equals(action)?Arrays.asList("visitor","admin"):"review".equals(action)?Arrays.asList("student","teacher","admin"):Collections.emptyList();
  if(!allowed.contains(user.role))throw new ApiException(403,"当前角色无权访问该接口");
  PersonEntity person=dao.person(user.personId),host=null,visitor=null;
  if("review".equals(action)&&person==null&&!"admin".equals(user.role))throw new ApiException(403,"账号未关联有效人员档案");
  if("create".equals(action)){
   String hostText=text(body,"host").trim(),hostId=text(body,"hostId").trim();
   for(PersonEntity h:dao.people())if(Arrays.asList("student","teacher","admin").contains(h.role)&&(Objects.equals(h.id,hostText)||Objects.equals(h.code,hostText)||(!hostId.isEmpty()&&Objects.equals(h.id,hostId)))){host=h;break;}
   if("visitor".equals(user.role))visitor=person;
   else {UserEntity selected=dao.user(text(body,"userId"));visitor=selected==null?dao.person(text(body,"visitorId")):dao.person(selected.personId);}
  }
  return map("actor",map("id",user.id,"username",user.username,"role",user.role,"personId",user.personId,"personName",person==null?null:person.name,"phone",person==null?null:person.phone),"host",host,"visitor",visitor,"servedBy",port);
 }
 private String text(Map<String,Object>b,String k){return b.get(k)==null?"":String.valueOf(b.get(k));}
 private boolean notEmpty(String s){return s!=null&&!s.isEmpty();}
}
