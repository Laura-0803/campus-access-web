"""Create isolated access module; no original source or database operations."""
from pathlib import Path
R=Path(__file__).resolve().parents[1];B=R/'backend/access-service';J=B/'src/main/java/edu/hfut/access';Q=B/'src/main/resources'
def write(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8')
if B.exists():raise SystemExit('Refusing to overwrite access module')
write(B/'pom.xml',(R/'backend/appointment-service/pom.xml').read_text(encoding='utf-8').replace('<artifactId>appointment-service</artifactId>','<artifactId>access-service</artifactId>'))
for folder in ['exception','dto','config']:
 for p in (R/'backend/appointment-service/src/main/java/edu/hfut/appointment'/folder).glob('*.java'):
  if p.name in ['ApiException.java','ApiAdvice.java','Envelope.java','LocalBoundary.java']:
   write(J/folder/p.name,p.read_text(encoding='utf-8').replace('edu.hfut.appointment','edu.hfut.access').replace('P3','P4').replace('campus_p3_appointment_','campus_p4_access_').replace('X-P4-Service','X-P4-Service').replace('"appointment-service"','"access-service"'))
write(J/'AccessApplication.java','''package edu.hfut.access;
import org.springframework.boot.*;import org.springframework.boot.autoconfigure.*;import org.springframework.cloud.openfeign.*;import org.springframework.cloud.netflix.hystrix.*;import org.mybatis.spring.annotation.MapperScan;
@SpringBootApplication @EnableFeignClients @EnableHystrix @MapperScan("edu.hfut.access.dao") public class AccessApplication {public static void main(String[]a){SpringApplication.run(AccessApplication.class,a);}}
''')
props=(R/'backend/appointment-service/src/main/resources/application.properties').read_text(encoding='utf-8').replace('19821','19841').replace('appointment-service','access-service').replace('P3_','P4_')
write(Q/'application.properties',props+'\nmybatis.configuration.call-setters-on-nulls=true\nappointment-service.ribbon.ServerListRefreshInterval=1000\nlegacy-bridge.ribbon.ServerListRefreshInterval=1000\n')
for name in ['DirectoryFeignConfig.java']:
 write(J/'client'/name,(R/'backend/appointment-service/src/main/java/edu/hfut/appointment/client'/name).read_text(encoding='utf-8').replace('edu.hfut.appointment','edu.hfut.access'))
write(J/'dto/Context.java','''package edu.hfut.access.dto;import java.util.*;
public class Context {public Map<String,Object> actor,person,vehicle;public boolean unavailable;public int servedBy;public boolean faceAvailable;}
''')
write(J/'client/DirectoryClient.java','''package edu.hfut.access.client;import java.util.*;import org.springframework.cloud.openfeign.*;import org.springframework.web.bind.annotation.*;import edu.hfut.access.dto.Context;
@FeignClient(name="user-service",configuration=DirectoryFeignConfig.class,fallbackFactory=DirectoryFallback.class) public interface DirectoryClient {
 @PostMapping("/internal/access-context")Context resolve(@RequestHeader("X-Campus-Internal")String key,@RequestHeader("Authorization")String token,@RequestBody Map<String,Object> body);
 @GetMapping("/internal/access-people")List<Map<String,Object>> people(@RequestHeader("X-Campus-Internal")String key);
}
''')
write(J/'client/DirectoryFallback.java','''package edu.hfut.access.client;import java.util.*;import org.springframework.stereotype.Component;import feign.hystrix.FallbackFactory;import edu.hfut.access.dto.Context;
@Component public class DirectoryFallback implements FallbackFactory<DirectoryClient>{public DirectoryClient create(Throwable t){return new DirectoryClient(){public Context resolve(String k,String token,Map<String,Object>b){Context c=new Context();c.unavailable=true;return c;}public List<Map<String,Object>>people(String k){return null;}};}}
''')
write(J/'client/AppointmentClient.java','''package edu.hfut.access.client;import java.util.*;import org.springframework.cloud.openfeign.*;import org.springframework.web.bind.annotation.*;
@FeignClient(name="appointment-service",contextId="accessAppointments",configuration=DirectoryFeignConfig.class,fallbackFactory=AppointmentFallback.class)public interface AppointmentClient{
 @GetMapping("/internal/access-appointment/{id}")Map<String,Object> one(@RequestHeader("X-Campus-Internal")String key,@PathVariable("id")String id);
}
''')
write(J/'client/AppointmentFallback.java','''package edu.hfut.access.client;import java.util.*;import org.springframework.stereotype.Component;import feign.hystrix.FallbackFactory;
@Component public class AppointmentFallback implements FallbackFactory<AppointmentClient>{public AppointmentClient create(Throwable t){return(k,id)->Collections.singletonMap("unavailable",true);}}
''')
write(J/'client/SafetyClient.java','''package edu.hfut.access.client;import java.util.*;import org.springframework.cloud.openfeign.*;import org.springframework.web.bind.annotation.*;
@FeignClient(name="legacy-bridge",contextId="accessSafety",configuration=DirectoryFeignConfig.class,fallbackFactory=SafetyFallback.class)public interface SafetyClient{
 @PostMapping("/internal/access-blacklist")Map<String,Object> check(@RequestHeader("X-Campus-Internal")String key,@RequestBody Map<String,Object> body);
}
''')
write(J/'client/SafetyFallback.java','''package edu.hfut.access.client;import java.util.*;import org.springframework.stereotype.Component;import feign.hystrix.FallbackFactory;
@Component public class SafetyFallback implements FallbackFactory<SafetyClient>{public SafetyClient create(Throwable t){return(k,b)->Collections.singletonMap("available",false);}}
''')
tables={
'qr_codes':'id token type ownerName ownerId visitorId appointmentId validFrom validTo status',
'access_records':'id time name personId type method gate status',
'devices':'id name type gate status',
'gates':'id name campus location openTime status',
'access_rules':'id role methods allowedTime gates status',
'settings':'id gateOpenTime gateCloseTime visitorQrMinutes alumniQrMinutes faceThreshold highRiskAutoBlock'}
def snake(s):return ''.join('_'+c.lower()if c.isupper()else c for c in s)
xml=['<?xml version="1.0" encoding="UTF-8"?>','<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">','<mapper namespace="edu.hfut.access.dao.AccessMapper">']
xml+=['<select id="list" resultType="map"><choose>']
for table,cols in tables.items():
 fields=cols.split();select=','.join('`'+snake(f)+'` AS `'+f+'`'for f in fields)
 xml+=['<when test="table == \''+table+'\'">SELECT '+select+' FROM '+table+(' WHERE id=\'main\''if table=='settings'else' ORDER BY sort_order,id')+'</when>']
xml+=['<otherwise>SELECT NULL WHERE FALSE</otherwise></choose></select>']
for op in ['insert','update','delete']:
 xml+=['<'+('update'if op=='update'else op)+' id="'+op+'"><choose>']
 for table,cols in tables.items():
  fields=cols.split();columns=','.join('`'+snake(f)+'`'for f in fields);params=','.join('#{row.'+f+'}'for f in fields)
  if op=='insert':sql='INSERT INTO '+table+'('+columns+(''if table=='settings'else',sort_order')+') VALUES('+params+(''if table=='settings'else',-CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 AS SIGNED)')+')'
  elif op=='update':sql='UPDATE '+table+' SET '+','.join('`'+snake(f)+'`=#{row.'+f+'}'for f in fields if f!='id')+' WHERE id=#{row.id}'
  else:sql='DELETE FROM '+table+' WHERE id=#{row.id}'
  xml+=['<when test="table == \''+table+'\'">'+sql+'</when>']
 xml+=['</choose></'+('update'if op=='update'else op)+'>']
xml+=['<select id="lock" resultType="map">SELECT id FROM qr_codes WHERE id=#{id} FOR UPDATE</select>','<select id="request" resultType="map">SELECT request_digest,response_json FROM access_requests WHERE request_id=#{id} FOR UPDATE</select>','<insert id="reserveRequest">INSERT INTO access_requests(request_id,request_digest) VALUES(#{id},#{digest}) ON DUPLICATE KEY UPDATE request_id=request_id</insert>','<update id="completeRequest">UPDATE access_requests SET response_json=#{response} WHERE request_id=#{id}</update>','<insert id="event">INSERT INTO access_outbox(event_id,kind,payload,state,attempts) VALUES(#{id},#{kind},#{payload},\'PENDING\',0)</insert>','</mapper>']
write(Q/'mapper/AccessMapper.xml','\n'.join(xml))
write(J/'dao/AccessMapper.java','''package edu.hfut.access.dao;import java.util.*;import org.apache.ibatis.annotations.Param;
public interface AccessMapper{
 List<Map<String,Object>>list(String table);
 int insert(@Param("table")String table,@Param("row")Map<String,Object> row);
 int update(@Param("table")String table,@Param("row")Map<String,Object> row);
 int delete(@Param("table")String table,@Param("row")Map<String,Object> row);
 Map<String,Object>lock(String id);
 Map<String,Object>request(String id);
 int reserveRequest(@Param("id")String id,@Param("digest")String digest);
 int completeRequest(@Param("id")String id,@Param("response")String response);
 int event(@Param("id")String id,@Param("kind")String kind,@Param("payload")String payload);
}
''')
for table,cols in tables.items():
 name=''.join(s.title()for s in table.split('_'));write(J/'entity'/(name+'.java'),'package edu.hfut.access.entity;public class '+name+' {public String '+','.join(cols.split())+';}\n')
write(J/'security/Identity.java','''package edu.hfut.access.security;import java.util.*;import javax.servlet.http.HttpServletRequest;import edu.hfut.access.dto.Context;import edu.hfut.access.exception.ApiException;
public final class Identity{
 public static String token(HttpServletRequest r){String h=r.getHeader("Authorization");return h!=null&&h.toLowerCase(Locale.ROOT).startsWith("bearer ")?h.substring(7).trim():r.getHeader("x-campus-token");}
 public static String text(Map<String,?>m,String k){return m==null||m.get(k)==null?"":String.valueOf(m.get(k));}
 public static void require(Context c,String...roles){if(!Arrays.asList(roles).contains(text(c.actor,"role")))throw new ApiException(403,"当前角色无权访问该接口");}
}
''')
print('Created access module infrastructure; business service intentionally follows separately')
