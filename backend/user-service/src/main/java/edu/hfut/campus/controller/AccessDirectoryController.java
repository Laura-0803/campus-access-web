package edu.hfut.campus.controller;
import java.util.*;import javax.servlet.http.HttpServletRequest;import org.springframework.web.bind.annotation.*;import org.springframework.beans.factory.annotation.Value;import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;import edu.hfut.campus.dao.*;import edu.hfut.campus.entity.*;import edu.hfut.campus.security.*;import edu.hfut.campus.exception.ApiException;import static edu.hfut.campus.dto.Responses.map;
@RestController @ConditionalOnProperty(name="p4.internal.enabled",havingValue="true")public class AccessDirectoryController{
 private final SessionAuthority auth;private final UserMapper dao;private final DomainMapper domain;@Value("${server.port}")int port;
 public AccessDirectoryController(SessionAuthority a,UserMapper d,DomainMapper domain){auth=a;dao=d;this.domain=domain;}
 private String text(Map<String,Object>b,String k){return b.get(k)==null?"":String.valueOf(b.get(k));}
 @PostMapping("/internal/access-context")public Object context(HttpServletRequest r,@RequestBody Map<String,Object>b){
  UserEntity u=auth.resolve(Authentication.token(r));PersonEntity current=dao.person(u.personId),selected=current;VehicleEntity vehicle=null;String action=text(b,"action"),value=text(b,"credentialValue");
  if(Arrays.asList("scan","record").contains(action)&&!Arrays.asList("guard","admin").contains(u.role))throw new ApiException(403,"当前角色无权访问该接口");
  if("select".equals(action)&&!"admin".equals(u.role))throw new ApiException(403,"当前角色无权访问该接口");
  if("select".equals(action)||"record".equals(action)){
   selected=null;for(PersonEntity p:dao.people())if(Objects.equals(p.id,b.get("ownerId"))||Objects.equals(p.name,b.get("ownerName"))||Objects.equals(p.id,b.get("personId"))||Objects.equals(p.name,b.get("name"))){selected=p;break;}
  }else if("qr-person".equals(action)){
   if(!Arrays.asList("visitor","alumni","guard","admin").contains(u.role))throw new ApiException(403,"当前角色无权访问该接口");
   if(Arrays.asList("guard","admin").contains(u.role))selected=dao.person(text(b,"personId"));
   else if(current==null||!Objects.equals(current.id,b.get("personId")))throw new ApiException(403,"无权核验该二维码");
  }else if("scan".equals(action)){
   selected=null;String kind=text(b,"credentialType");
   if("plate".equals(kind)){for(VehicleEntity v:domain.vehicles())if(Objects.equals(v.plateNo,value)){vehicle=v;selected=dao.person(v.ownerId);break;}}
   else for(PersonEntity p:dao.people())if(Objects.equals(p.id,value)||Objects.equals(p.code,value)||Objects.equals(p.idNumber,value)){selected=p;break;}
  }
  boolean face=false;if(selected!=null)for(Map<String,Object> f:dao.faces())if(Objects.equals(f.get("personId"),selected.id)&&"已上传".equals(f.get("status"))){face=true;break;}
  boolean enabled=true;if(selected!=null)for(UserEntity account:dao.users())if(Objects.equals(account.personId,selected.id)&&account.status!=null&&!"启用".equals(account.status))enabled=false;
  Object view=selected==null?null:map("id",selected.id,"name",selected.name,"type",selected.type,"role",selected.role,"code",selected.code,"phone",selected.phone,"idNumber",selected.idNumber,"status",selected.status,"accountEnabled",enabled);
  return map("actor",map("id",u.id,"role",u.role,"personId",u.personId,"name",current==null?u.username:current.name),"person",view,"vehicle",vehicle,"faceAvailable",face,"servedBy",port);
 }
 @GetMapping("/internal/access-people")public Object people(){List<Object> out=new ArrayList<>();for(PersonEntity p:dao.people())out.add(map("id",p.id,"name",p.name,"code",p.code,"type",p.type));return out;}
}
