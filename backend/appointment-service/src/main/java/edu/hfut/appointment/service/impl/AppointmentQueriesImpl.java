package edu.hfut.appointment.service.impl;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.LongAdder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import edu.hfut.appointment.client.UserDirectory;
import edu.hfut.appointment.dto.*;
import edu.hfut.appointment.entity.Appointment;
import edu.hfut.appointment.dao.AppointmentMapper;
import edu.hfut.appointment.exception.ApiException;
import edu.hfut.appointment.service.AppointmentQueries;
@Service public class AppointmentQueriesImpl implements AppointmentQueries {
 private final AppointmentMapper dao;private final UserDirectory users;
 @Value("${P3_INTERNAL_KEY}")private String key;
 private final ConcurrentMap<Integer,LongAdder> handled=new ConcurrentHashMap<>();
 public AppointmentQueriesImpl(AppointmentMapper dao,UserDirectory users){this.dao=dao;this.users=users;}
 private DirectoryContext identity(String token,String visitorId){
  DirectoryContext c=users.context(key,"Bearer "+(token==null?"":token),visitorId==null?"":visitorId);
  if(c==null||c.unavailable||c.actor==null)throw new ApiException(503,"身份验证服务不可用");
  handled.computeIfAbsent(c.servedBy,p->new LongAdder()).increment();
  if(!Arrays.asList("student","teacher","visitor","admin").contains(c.actor.role))throw new ApiException(403,"当前角色无权访问该接口");
  return c;
 }
 public Map<Integer,Long> instanceCounts(){Map<Integer,Long> out=new TreeMap<>();handled.forEach((p,n)->out.put(p,n.sum()));return out;}
 public Object hosts(String token){return Envelope.list(identity(token,"").hosts);}
 public Object list(String token,Map<String,String> query){
  DirectoryContext c=identity(token,query.get("visitorId"));Map<String,String> q=new HashMap<>(query);q.remove("scopeName");q.remove("scopePhone");
  if(Arrays.asList("student","teacher").contains(c.actor.role)){q.put("hostId",c.actor.personId);q.remove("visitorId");q.remove("visitorPhone");}
  if("visitor".equals(c.actor.role)){q.put("visitorId",c.actor.personId);if(c.actor.phone!=null&&!c.actor.phone.isEmpty())q.put("visitorPhone",c.actor.phone);q.remove("hostId");}
  DirectoryContext.PersonScope scope=c.visitorScope;
  if(scope!=null){q.put("scopeName",scope.name);q.put("scopePhone",scope.phone);}
  return Envelope.list(dao.list(q));
 }
 public Object one(String token,String id){
  DirectoryContext c=identity(token,"");Appointment a=dao.one(id);if(a==null)throw new ApiException(404,"预约不存在");
  DirectoryContext.Actor u=c.actor;boolean yes="admin".equals(u.role);
  if(Arrays.asList("student","teacher").contains(u.role))yes=Objects.equals(a.hostId,u.personId)||Objects.equals(a.host,u.personName);
  if("visitor".equals(u.role))yes=Objects.equals(a.visitorId,u.personId)||Objects.equals(a.visitorPhone,u.phone)||Objects.equals(a.visitor,u.personName);
  if(!yes)throw new ApiException(403,"无权查看该预约");return Envelope.ok(a);
 }
}
