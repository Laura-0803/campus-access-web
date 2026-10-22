package edu.hfut.appointment.service.impl;
import java.util.*;
import java.util.concurrent.atomic.*;
import java.time.*;
import java.time.format.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.hfut.appointment.dto.*;
import edu.hfut.appointment.entity.*;
import edu.hfut.appointment.client.*;
import edu.hfut.appointment.dao.AppointmentMapper;
import edu.hfut.appointment.service.AppointmentCommands;
import edu.hfut.appointment.exception.ApiException;
@Service public class AppointmentCommandsImpl implements AppointmentCommands {
 private final UserDirectory users;private final BlacklistClient blacklist;private final AppointmentMapper dao;private final ObjectMapper json;
 @Value("${P3_INTERNAL_KEY}")String key;private final AtomicInteger sequence=new AtomicInteger();
 public AppointmentCommandsImpl(UserDirectory users,BlacklistClient blacklist,AppointmentMapper dao,ObjectMapper json){this.users=users;this.blacklist=blacklist;this.dao=dao;this.json=json;}
 private String str(Map<String,Object>b,String k){Object v=b.get(k);return v==null?"":String.valueOf(v);}
 private String now(){return LocalDateTime.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));}
 private WriteContext resolve(String token,Map<String,Object>b,String action){Map<String,Object> request=new HashMap<>(b);request.put("action",action);WriteContext c=users.resolve(key,"Bearer "+(token==null?"":token),request);if(c==null||c.unavailable||c.actor==null)throw new ApiException(503,"身份验证服务不可用");return c;}
 private void required(Map<String,Object>b,String...fields){List<String> missing=new ArrayList<>();for(String f:fields)if(str(b,f).trim().isEmpty())missing.add(f);if(!missing.isEmpty())throw new ApiException(400,"预约信息不完整",Collections.singletonMap("missing",missing));}
 private String normalized(String value){return value==null?"":value.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+","");}
 private void blacklist(String credential,boolean review){BlacklistClient.Result result=blacklist.check(key,Collections.singletonMap("credential",credential));if(result==null||!result.available||result.blocked==null)throw new ApiException(503,"黑名单服务不可用");if(result.blocked)throw new ApiException(403,review?"该访客身份证号已在黑名单中，禁止通过预约":"该身份证号已在黑名单中，禁止提交访客预约");}
 private void host(WriteContext c){if(c.host==null)throw new ApiException(404,"被访人必须填写系统内学生、教职工或保卫处管理员的学号/工号/编号，不能填写姓名");if(!"正常".equals(c.host.status))throw new ApiException(403,"被访人当前状态不可预约");}
 private void record(Appointment a,String before,String action,DirectoryContext.Actor actor){
  String eventId="P3-AUDIT-"+UUID.randomUUID();Map<String,Object> event=new LinkedHashMap<>();event.put("eventId",eventId);event.put("appointmentId",a.id);event.put("actorId",actor.id);event.put("actor",actor.personName==null||actor.personName.isEmpty()?actor.username:actor.personName);event.put("role",actor.role);event.put("action",action);event.put("occurredAt",now());
  Map<String,Object> history=new HashMap<>(event);history.put("beforeStatus",before);history.put("afterStatus",a.status);history.put("version",a.version);history.put("comment",a.reviewComment);dao.insertHistory(history);
  try{dao.insertOutbox(eventId,a.id,json.writeValueAsString(event));}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Audit event serialization failed");}
 }
 @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
 public Object create(String token,Map<String,Object>b){
  WriteContext c=resolve(token,b,"create");boolean admin="admin".equals(c.actor.role);
  if(admin)required(b,"visitor","visitorPhone","host","reason","visitStart");else required(b,"host","reason","visitStart");
  Long start=LegacyDateTime.parse(str(b,"visitStart")),end=str(b,"visitEnd").isEmpty()?null:LegacyDateTime.parse(str(b,"visitEnd"));
  if(start==null||start==0)throw new ApiException(400,"来访时间格式不正确");if(end!=null&&end!=0&&end<=start)throw new ApiException(400,"预计离校时间必须晚于来访时间");
  // Refresh authoritative identity and host immediately before the local write.
  c=resolve(token,b,"create");admin="admin".equals(c.actor.role);if(admin)required(b,"visitor","visitorPhone","host","reason","visitStart");
  host(c);if("visitor".equals(c.actor.role)&&c.visitor==null)throw new ApiException(404,"访客账号资料不存在");
  String credential=normalized(c.visitor==null||empty(c.visitor.idNumber)?str(b,"idNumber"):c.visitor.idNumber);if(!credential.isEmpty())blacklist(credential,false);
  Appointment a=new Appointment();a.id="A"+LocalDate.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.BASIC_ISO_DATE)+Long.toString(System.currentTimeMillis(),36).toUpperCase(Locale.ROOT)+String.format(Locale.ROOT,"%04d",Math.floorMod(sequence.incrementAndGet(),10000));
  a.visitor=c.visitor!=null&&!empty(c.visitor.name)?c.visitor.name:str(b,"visitor");a.visitorId=c.visitor!=null&&!empty(c.visitor.id)?c.visitor.id:empty(str(b,"visitorId"))?null:str(b,"visitorId");
  a.visitorPhone=c.visitor!=null&&!empty(c.visitor.phone)?c.visitor.phone:!empty(str(b,"visitorPhone"))?str(b,"visitorPhone"):str(b,"phone");a.idNumber=credential;a.host=c.host.name;a.hostId=c.host.id;a.time=str(b,"visitStart");a.visitStart=a.time;a.visitEnd=str(b,"visitEnd");a.reason=str(b,"reason");a.status="admin".equals(c.host.role)?AppointmentStatus.SECURITY_PENDING.text:AppointmentStatus.HOST_PENDING.text;a.createdAt=now();a.version=0L;
  dao.insert(a);record(a,null,"CREATE",c.actor);
  Map<String,Object> result=new LinkedHashMap<>();result.put("id",a.id);result.put("visitor",a.visitor);result.put("visitorId",a.visitorId);result.put("visitorPhone",a.visitorPhone);result.put("idNumber",a.idNumber);result.put("host",a.host);result.put("hostId",a.hostId);result.put("time",b.get("visitStart"));result.put("visitStart",b.get("visitStart"));result.put("visitEnd",a.visitEnd);result.put("reason",b.get("reason"));result.put("status",a.status);result.put("createdAt",a.createdAt);return result;
 }
 private boolean empty(String s){return s==null||s.isEmpty();}
 @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
 public Object review(String token,String id,Map<String,Object>b){
  resolve(token,Collections.emptyMap(),"review");String requested=str(b,"status");if(!Arrays.asList("已通过","未通过").contains(requested))throw new ApiException(400,"审核状态必须为已通过或未通过");
  Appointment a=dao.lock(id);if(a==null)throw new ApiException(404,"预约不存在");
  // Crucial: revalidate after acquiring a possibly contended database row lock.
  WriteContext c=resolve(token,Collections.emptyMap(),"review");
  if("已通过".equals(requested))blacklist(a.idNumber,true);
  String before=a.status,action;
  if(Arrays.asList("student","teacher").contains(c.actor.role)){
   if(!Objects.equals(a.hostId,c.actor.personId))throw new ApiException(403,"只能审核自己作为被访人的预约");
   if(!AppointmentStatus.hostPending(a.status))throw new ApiException(400,"当前预约不在被访人审核阶段");
   a.status="已通过".equals(requested)?"待保卫处审核":"未通过";action="已通过".equals(requested)?"HOST_APPROVE":"HOST_REJECT";
  }else{
   if(!"admin".equals(c.actor.role))throw new ApiException(403,"当前角色无权审核预约");
   if(!"待保卫处审核".equals(a.status))throw new ApiException(400,"当前预约不在保卫处审核阶段");
   if("已通过".equals(requested))throw new ApiException(503,"通行凭证签发服务尚未启用，暂不能完成最终审批");
   a.status="未通过";action="SECURITY_REJECT";
  }
  a.reviewedAt=now();a.reviewer=empty(c.actor.personName)?c.actor.username:c.actor.personName;a.reviewComment=b.containsKey("comment")?(b.get("comment")==null?null:str(b,"comment")):"";
  if(dao.transition(a,before)!=1)throw new ApiException(400,"预约状态已变化，请重新查询");a.version=a.version+1;record(a,before,action,c.actor);
  Map<String,Object> result=new LinkedHashMap<>();result.put("appointment",a);result.put("qrCode",null);return result;
 }
}
