raise SystemExit("Historical generator retained for audit; use the reviewed backend sources")
"""Create the formal P2 project once; never overwrite existing implementation."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
B=R/'backend'
if B.exists(): raise SystemExit('Formal project already exists; edit it directly')
def put(name, text):
 p=B/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text.strip()+'\n',encoding='utf-8')
put('pom.xml','''<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>2.3.12.RELEASE</version><relativePath/></parent><groupId>edu.hfut.campus</groupId><artifactId>campus-services</artifactId><version>0.2.0-SNAPSHOT</version><packaging>pom</packaging><properties><java.version>11</java.version><spring-cloud.version>Hoxton.SR12</spring-cloud.version></properties><modules><module>eureka-server</module><module>gateway-service</module><module>user-service</module></modules><dependencyManagement><dependencies><dependency><groupId>org.springframework.cloud</groupId><artifactId>spring-cloud-dependencies</artifactId><version>${spring-cloud.version}</version><type>pom</type><scope>import</scope></dependency></dependencies></dependencyManagement><build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build></project>''')
deps=lambda xs: ''.join('<dependency><groupId>'+g+'</groupId><artifactId>'+a+'</artifactId>'+('<version>'+v+'</version>' if v else '')+'</dependency>' for g,a,v in xs)
cloud=lambda a:('org.springframework.cloud',a,None)
boot=lambda a:('org.springframework.boot',a,None)
for module,ds in {
 'eureka-server':[cloud('spring-cloud-starter-netflix-eureka-server')],
 'gateway-service':[cloud('spring-cloud-starter-gateway'),cloud('spring-cloud-starter-netflix-eureka-client'),cloud('spring-cloud-starter-netflix-ribbon')],
 'user-service':[boot('spring-boot-starter-web'),cloud('spring-cloud-starter-netflix-eureka-client'),cloud('spring-cloud-starter-netflix-ribbon'),cloud('spring-cloud-starter-openfeign'),cloud('spring-cloud-starter-netflix-hystrix'),('org.mybatis.spring.boot','mybatis-spring-boot-starter','2.1.4'),('mysql','mysql-connector-java',None)]}.items():
 put(module+'/pom.xml','<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><parent><groupId>edu.hfut.campus</groupId><artifactId>campus-services</artifactId><version>0.2.0-SNAPSHOT</version></parent><artifactId>'+module+'</artifactId><dependencies>'+deps(ds)+'</dependencies></project>')
common='''server.address=127.0.0.1
eureka.client.service-url.defaultZone=http://localhost:19761/eureka/,http://127.0.0.1:19762/eureka/
eureka.client.registry-fetch-interval-seconds=3
eureka.client.initial-instance-info-replication-interval-seconds=1
eureka.instance.prefer-ip-address=true
eureka.instance.ip-address=127.0.0.1
eureka.instance.instance-id=${spring.application.name}:${server.port}
eureka.instance.lease-renewal-interval-in-seconds=10
eureka.instance.lease-expiration-duration-in-seconds=90
logging.level.com.netflix.discovery=warn
logging.level.com.netflix.eureka=warn
'''
put('eureka-server/src/main/resources/application.properties',common.replace('prefer-ip-address=true','prefer-ip-address=false')+'''spring.application.name=campus-registry
server.port=19761
eureka.instance.hostname=${REGISTRY_HOST:localhost}
eureka.client.service-url.defaultZone=${PEER_URL:http://127.0.0.1:19762/eureka/}
eureka.server.enable-self-preservation=false
eureka.server.response-cache-update-interval-ms=1000
''')
put('eureka-server/src/main/java/edu/hfut/campus/RegistryApplication.java','''package edu.hfut.campus;
import org.springframework.boot.*;import org.springframework.boot.autoconfigure.*;import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;
@SpringBootApplication @EnableEurekaServer public class RegistryApplication {public static void main(String[] a){SpringApplication.run(RegistryApplication.class,a);}}
''')
put('gateway-service/src/main/resources/application.properties',common+'''spring.application.name=campus-gateway
server.port=19800
user-service.ribbon.ServerListRefreshInterval=2000
''')
put('gateway-service/src/main/java/edu/hfut/campus/GatewayApplication.java','''package edu.hfut.campus;
import org.springframework.boot.*;import org.springframework.boot.autoconfigure.*;import org.springframework.context.annotation.*;import org.springframework.cloud.gateway.route.*;import org.springframework.cloud.gateway.filter.*;import org.springframework.core.Ordered;
@SpringBootApplication public class GatewayApplication {
 public static void main(String[] a){SpringApplication.run(GatewayApplication.class,a);}
 @Bean RouteLocator routes(RouteLocatorBuilder b){return b.routes().route("users",r->r.path("/api/auth/**","/api/roles").uri("lb://user-service")).route("legacy",r->r.path("/api/**").uri("http://127.0.0.1:19830")).build();}
 @Bean GlobalFilter stripIdentity(){return (exchange,chain)->chain.filter(exchange.mutate().request(exchange.getRequest().mutate().headers(h->{for(String n:new java.util.ArrayList<>(h.keySet()))if(n.toLowerCase().startsWith("x-user")||n.toLowerCase().startsWith("x-role")||n.toLowerCase().startsWith("x-campus-internal")||n.equalsIgnoreCase("x-adapter-key"))h.remove(n);h.set("X-Adapter-Key",System.getenv("P2_ADAPTER_KEY"));}).build()).build());}
}
''')
put('user-service/src/main/resources/application.properties',common+'''spring.application.name=user-service
server.port=19811
spring.datasource.url=${P2_DB_URL}
spring.datasource.username=${P2_DB_USER}
spring.datasource.password=${P2_DB_PASSWORD}
mybatis.mapper-locations=classpath:mapper/*.xml
mybatis.configuration.map-underscore-to-camel-case=true
spring.jackson.default-property-inclusion=non_null
server.error.include-message=never
feign.hystrix.enabled=true
feign.client.config.default.connectTimeout=700
feign.client.config.default.readTimeout=1000
hystrix.command.default.execution.isolation.thread.timeoutInMilliseconds=1800
hystrix.command.default.circuitBreaker.requestVolumeThreshold=3
hystrix.command.default.circuitBreaker.sleepWindowInMilliseconds=3000
logging.level.edu.hfut.campus=INFO
''')
base='user-service/src/main/java/edu/hfut/campus/'
def java(name,text):put(base+name+'.java',text)
java('UserApplication','''package edu.hfut.campus;
import org.springframework.boot.*;import org.springframework.boot.autoconfigure.*;import org.springframework.cloud.openfeign.EnableFeignClients;import org.springframework.cloud.netflix.hystrix.EnableHystrix;import org.mybatis.spring.annotation.MapperScan;
@SpringBootApplication @EnableFeignClients @EnableHystrix @MapperScan("edu.hfut.campus.dao") public class UserApplication{public static void main(String[]a){SpringApplication.run(UserApplication.class,a);}}
''')
java('entity/UserEntity','''package edu.hfut.campus.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;
public class UserEntity {public String id,username,accountType,role,personId,status; @JsonIgnore public String password;}
''')
java('entity/PersonEntity','''package edu.hfut.campus.entity;
public class PersonEntity {public String id,name,type,code,idNumber,role,college,className,phone,faceStatus,status,department,position,host,company,graduationYear,major,gate;}
''')
java('dto/Responses','''package edu.hfut.campus.dto;
import java.util.*;public final class Responses {
 public static Map<String,Object> map(Object...v){Map<String,Object> m=new LinkedHashMap<>();for(int i=0;i<v.length;i+=2)m.put((String)v[i],v[i+1]);return m;}
 public static Map<String,Object> ok(Object data){return map("success",true,"data",data);}
 public static String str(Map<String,?> b,String k){Object v=b.get(k);return v==null?"":String.valueOf(v);}
}
''')
java('exception/ApiException','''package edu.hfut.campus.exception;
public class ApiException extends RuntimeException {public final int status;public final Object details;public ApiException(int s,String m){this(s,m,null);}public ApiException(int s,String m,Object d){super(m);status=s;details=d;}}
''')
java('exception/Errors','''package edu.hfut.campus.exception;
import org.springframework.web.bind.annotation.*;import org.springframework.http.*;import org.springframework.dao.*;import static edu.hfut.campus.dto.Responses.*;
@RestControllerAdvice public class Errors {
 @ExceptionHandler(ApiException.class) public ResponseEntity<?> api(ApiException e){return ResponseEntity.status(e.status).body(map("success",false,"error",e.details==null?map("message",e.getMessage()):map("message",e.getMessage(),"details",e.details)));}
 @ExceptionHandler(DuplicateKeyException.class) public ResponseEntity<?> duplicate(){return api(new ApiException(409,"账号或人员编号已存在"));}
 @ExceptionHandler(Exception.class) public ResponseEntity<?> unexpected(Exception e){return api(new ApiException(500,"服务器内部错误"));}
}
''')
java('security/Passwords','''package edu.hfut.campus.security;
import java.security.*;import javax.crypto.*;import javax.crypto.spec.*;import java.nio.charset.StandardCharsets;import org.springframework.stereotype.Component;
@Component public class Passwords {
 public static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte x:b)s.append(String.format("%02x",x&255));return s.toString();}
 public static String digest(String s){try{return hex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException();}}
 private byte[] derive(String p,String salt,int n)throws Exception{return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(new PBEKeySpec(p.toCharArray(),salt.getBytes(StandardCharsets.UTF_8),n,256)).getEncoded();}
 public String hash(String p){try{byte[] salt=new byte[16];new SecureRandom().nextBytes(salt);String s=hex(salt);return "pbkdf2$120000$"+s+"$"+hex(derive(p,s,120000));}catch(Exception e){throw new IllegalStateException();}}
 public boolean verify(String p,String stored){try{if(stored==null||!stored.startsWith("pbkdf2$"))return false;String[]s=stored.split("\\\\$",-1);int n=Integer.parseInt(s[1]);if(s.length!=4||n<1||n>1000000)return false;return MessageDigest.isEqual(hex(derive(p,s[2],n)).getBytes(StandardCharsets.US_ASCII),s[3].getBytes(StandardCharsets.US_ASCII));}catch(Exception e){return false;}}
}
''')
java('dao/UserMapper','''package edu.hfut.campus.dao;
import java.util.*;import org.apache.ibatis.annotations.Param;import edu.hfut.campus.entity.*;
public interface UserMapper {
 UserEntity account(String name);UserEntity user(String id);List<UserEntity> users();PersonEntity person(String id);List<PersonEntity> people();List<Map<String,Object>> roles();List<Map<String,Object>> profiles();
 Map<String,Object> session(String token);int insertSession(Map<String,Object> s);int deleteSession(String token);int deleteUserSessions(String id);int password(@Param("id")String id,@Param("hash")String hash);
 int insertUser(UserEntity u);int insertPerson(PersonEntity p);int audit(Map<String,Object> a);
 Map<String,Object> code(@Param("purpose")String purpose,@Param("phone")String phone);int saveCode(Map<String,Object> c);int deleteCode(@Param("purpose")String purpose,@Param("phone")String phone);int codeAttempt(@Param("purpose")String purpose,@Param("phone")String phone);
}
''')
xml='''<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd"><mapper namespace="edu.hfut.campus.dao.UserMapper">
<select id="account" resultType="edu.hfut.campus.entity.UserEntity">SELECT * FROM users WHERE username=#{name} LIMIT 1</select>
<select id="user" resultType="edu.hfut.campus.entity.UserEntity">SELECT * FROM users WHERE id=#{id}</select>
<select id="users" resultType="edu.hfut.campus.entity.UserEntity">SELECT * FROM users ORDER BY sort_order,id</select>
<select id="person" resultType="edu.hfut.campus.entity.PersonEntity">SELECT * FROM people WHERE id=#{id}</select>
<select id="people" resultType="edu.hfut.campus.entity.PersonEntity">SELECT * FROM people ORDER BY sort_order,id</select>
<select id="roles" resultType="map">SELECT role_key AS roleKey,label FROM roles ORDER BY role_key</select>
<select id="profiles" resultType="map">SELECT role_key AS roleKey,person_id AS personId,name,title,role_value AS role,type,avatar,status FROM role_profiles ORDER BY role_key</select>
<select id="session" resultType="map">SELECT user_id AS userId,expires_at AS expiresAt FROM sessions WHERE token=#{token}</select>
<insert id="insertSession">INSERT INTO sessions(token,user_id,role,created_at,expires_at) VALUES(#{token},#{userId},#{role},#{createdAt},#{expiresAt})</insert>
<delete id="deleteSession">DELETE FROM sessions WHERE token=#{token}</delete><delete id="deleteUserSessions">DELETE FROM sessions WHERE user_id=#{id}</delete>
<update id="password">UPDATE users SET password=#{hash} WHERE id=#{id}</update>
<insert id="insertUser">INSERT INTO users(id,username,account_type,password,role,person_id,status,sort_order) VALUES(#{id},#{username},#{accountType},#{password},#{role},#{personId},#{status},-UNIX_TIMESTAMP())</insert>
<insert id="insertPerson">INSERT INTO people(id,name,type,code,id_number,role,phone,company,status,sort_order) VALUES(#{id},#{name},#{type},#{code},#{idNumber},#{role},#{phone},#{company},#{status},-UNIX_TIMESTAMP())</insert>
<insert id="audit">INSERT INTO logs(id,time,actor,role,action,target,result,sort_order) VALUES(#{id},#{time},#{actor},#{role},#{action},#{target},'成功',-UNIX_TIMESTAMP())</insert>
<select id="code" resultType="map">SELECT purpose,phone,user_id AS userId,digest,sent_at AS sentAt,expires_at AS expiresAt,attempts FROM verification_codes WHERE purpose=#{purpose} AND phone=#{phone} FOR UPDATE</select>
<insert id="saveCode">INSERT INTO verification_codes(purpose,phone,user_id,digest,sent_at,expires_at,attempts) VALUES(#{purpose},#{phone},#{userId},#{digest},#{sentAt},#{expiresAt},0) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),digest=VALUES(digest),sent_at=VALUES(sent_at),expires_at=VALUES(expires_at),attempts=0</insert>
<delete id="deleteCode">DELETE FROM verification_codes WHERE purpose=#{purpose} AND phone=#{phone}</delete>
<update id="codeAttempt">UPDATE verification_codes SET attempts=attempts+1 WHERE purpose=#{purpose} AND phone=#{phone}</update>
</mapper>'''
put('user-service/src/main/resources/mapper/UserMapper.xml',xml)
java('security/SessionAuthority','''package edu.hfut.campus.security;
import edu.hfut.campus.dao.*;import edu.hfut.campus.entity.*;import edu.hfut.campus.exception.*;import org.springframework.stereotype.Service;import java.time.*;import java.util.*;
@Service public class SessionAuthority {private final UserMapper dao;public SessionAuthority(UserMapper d){dao=d;}
 public UserEntity resolve(String token){if(token==null||token.isEmpty())throw new ApiException(401,"请先登录后再访问系统接口");Map<String,Object>s=dao.session(Passwords.digest(token));if(s==null||!Instant.parse((String)s.get("expiresAt")).isAfter(Instant.now()))throw new ApiException(401,"登录状态已失效，请重新登录");UserEntity u=dao.user((String)s.get("userId"));if(u==null)throw new ApiException(401,"登录账号不存在，请重新登录");if(!"启用".equals(u.status))throw new ApiException(403,"账号已被停用");return u;}
}
''')
java('config/IsolationGuard','''package edu.hfut.campus.config;
import org.springframework.stereotype.Component;import org.springframework.beans.factory.annotation.Value;import javax.annotation.PostConstruct;import javax.sql.DataSource;import java.sql.*;
@Component public class IsolationGuard {private final DataSource ds;@Value("${server.address}")String address;@Value("${P2_INTERNAL_KEY}")String key;public IsolationGuard(DataSource d){ds=d;}
 @PostConstruct public void verify()throws Exception {if(!"127.0.0.1".equals(address)||key.length()<32)throw new IllegalStateException("Loopback and service credential required");try(Connection c=ds.getConnection()){String db=c.getCatalog();if(!db.matches("campus_p2_user_[0-9]{14}"))throw new IllegalStateException("Isolated schema required");try(Statement s=c.createStatement();ResultSet r=s.executeQuery("SHOW GRANTS")){while(r.next()){String g=r.getString(1);if(g.startsWith("GRANT ALL")||g.contains(" ON *.*")&&!g.startsWith("GRANT USAGE")||g.contains(" ON `")&&!g.contains("`"+db+"`.*"))throw new IllegalStateException("Account is not isolated");}}}}
}
''')
java('security/Authentication','''package edu.hfut.campus.security;
import javax.servlet.http.*;import org.springframework.web.servlet.*;import org.springframework.stereotype.Component;import org.springframework.beans.factory.annotation.Value;import edu.hfut.campus.exception.*;import java.security.*;import java.nio.charset.StandardCharsets;
@Component public class Authentication implements HandlerInterceptor {private final SessionAuthority auth;@Value("${P2_INTERNAL_KEY}")String key;public Authentication(SessionAuthority a){auth=a;}
 public static String token(HttpServletRequest r){String h=r.getHeader("Authorization");return h!=null&&h.toLowerCase().startsWith("bearer ")?h.substring(7).trim():r.getHeader("x-campus-token");}
 public boolean preHandle(HttpServletRequest r,HttpServletResponse s,Object h){String p=r.getRequestURI();if(p.startsWith("/internal/")){String k=r.getHeader("X-Campus-Internal");if(k==null||!MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),k.getBytes(StandardCharsets.UTF_8)))throw new ApiException(403,"内部接口禁止访问");return true;}
 if(p.equals("/api/roles")&&r.getMethod().equals("GET")||r.getMethod().equals("POST")&&java.util.Arrays.asList("/api/auth/login","/api/auth/send-code","/api/auth/reset-code","/api/auth/reset-password","/api/auth/register-visitor").contains(p))return true;
 r.setAttribute("identity",auth.resolve(token(r)));return true;}
}
''')
java('config/WebConfig','''package edu.hfut.campus.config;import org.springframework.context.annotation.Configuration;import org.springframework.web.servlet.config.annotation.*;import edu.hfut.campus.security.Authentication;
@Configuration public class WebConfig implements WebMvcConfigurer{private final Authentication auth;public WebConfig(Authentication a){auth=a;}public void addInterceptors(InterceptorRegistry r){r.addInterceptor(auth).addPathPatterns("/**");}}
''')
java('client/LegacyClient','''package edu.hfut.campus.client;
import org.springframework.cloud.openfeign.FeignClient;import org.springframework.web.bind.annotation.*;import java.util.Map;
@FeignClient(name="legacy-bridge",url="${P2_LEGACY_URL:http://127.0.0.1:19830}") public interface LegacyClient {
 @PostMapping("/internal/blacklist-check") Map<String,Object> blacklist(@RequestHeader("X-Campus-Internal")String key,@RequestBody Map<String,Object> body);
}
''')
java('service/AuthService','''package edu.hfut.campus.service;
import java.util.*;import edu.hfut.campus.entity.UserEntity;
public interface AuthService {Object login(Map<String,Object>b);Object roles();Object me(UserEntity u,String token,Map<String,String> q);Object logout(String token);Object change(UserEntity u,Map<String,Object>b);Object send(Map<String,Object>b,boolean reset);Object reset(Map<String,Object>b);Object register(Map<String,Object>b);Object projection();}
''')
java('service/impl/AuthServiceImpl','''package edu.hfut.campus.service.impl;
import java.util.*;import java.time.*;import java.time.format.*;import java.security.SecureRandom;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import org.springframework.beans.factory.annotation.Value;import org.springframework.web.client.RestTemplate;import org.springframework.http.*;
import edu.hfut.campus.service.AuthService;import edu.hfut.campus.dao.*;import edu.hfut.campus.entity.*;import edu.hfut.campus.security.*;import edu.hfut.campus.exception.*;import edu.hfut.campus.client.*;import static edu.hfut.campus.dto.Responses.*;
@Service public class AuthServiceImpl implements AuthService {
 private final UserMapper d;private final Passwords passwords;private final LegacyClient legacy;private final SecureRandom random=new SecureRandom();
 @Value("${P2_INTERNAL_KEY}")String key;@Value("${P2_DEMO:false}")boolean demo;@Value("${spring.profiles.active:}")String profile;@Value("${P2_DEMO_PHONES:}")String phones;@Value("${P2_SMS_URL:}")String smsUrl;@Value("${P2_SMS_KEY:}")String smsKey;
 public AuthServiceImpl(UserMapper d,Passwords p,LegacyClient l){this.d=d;passwords=p;legacy=l;}
 private void required(Map<String,Object>b,String message,String...names){List<String> missing=new ArrayList<>();for(String n:names)if(str(b,n).trim().isEmpty())missing.add(n);if(!missing.isEmpty())throw new ApiException(400,message,map("missing",missing));}
 private String phone(Map<String,Object>b){String p=str(b,"phone").trim();if(!p.matches("1[0-9]{10}"))throw new ApiException(400,"请输入 11 位有效手机号");return p;}
 private void audit(UserEntity u,String action){d.audit(map("id","L"+UUID.randomUUID(),"time",LocalDateTime.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),"actor",u.username,"role",u.role,"action",action,"target",u.id));}
 public Object roles(){Map<String,Object>roles=new LinkedHashMap<>(),profiles=new LinkedHashMap<>();for(Map<String,Object>r:d.roles())roles.put((String)r.get("roleKey"),r.get("label"));for(Map<String,Object>r:d.profiles()){Map<String,Object>p=new LinkedHashMap<>(r);String k=(String)p.remove("roleKey");profiles.put(k,p);}return map("roles",roles,"roleProfiles",profiles);}
 private Object session(UserEntity u,String token){PersonEntity p=d.person(u.personId);Map<String,Object>base=new LinkedHashMap<>();for(Map<String,Object>r:d.profiles())if(u.role.equals(r.get("roleKey")))base.putAll(r);base.remove("roleKey");base.put("personId",u.personId);base.put("role",u.role);if(p!=null){base.put("name",p.name);base.put("type",p.type);base.put("status",p.status);String t=p.company==null||p.company.isEmpty()?"访客用户":p.company;switch(u.role){case "student":t=p.className+" / "+p.college;break;case "teacher":t=p.department+" / "+p.position;break;case "alumni":t=p.graduationYear+" 届 / "+p.college;break;case "guard":t=p.gate+" / "+p.department;break;case "admin":t=p.department;}base.put("title",t);}return map("token",token,"user",u,"profile",base,"person",p);}
 @Transactional public Object login(Map<String,Object>b){String account=str(b,"account");if(account.isEmpty())account=str(b,"username");if(account.trim().isEmpty())throw new ApiException(400,"请输入学号、工号、校友编号或手机号");UserEntity u=d.account(account.trim());if(u==null)throw new ApiException(401,"账号不存在");if(!passwords.verify(str(b,"password"),u.password))throw new ApiException(401,"密码错误");if(!"启用".equals(u.status))throw new ApiException(403,"账号已被停用或锁定");String token=UUID.randomUUID().toString();Instant now=Instant.now();d.insertSession(map("token",Passwords.digest(token),"userId",u.id,"role",u.role,"createdAt",now.toString(),"expiresAt",now.plusSeconds(28800).toString()));audit(u,"登录系统");return session(u,token);}
 public Object me(UserEntity u,String token,Map<String,String>q){if("admin".equals(u.role)){if(q.containsKey("userId"))u=d.user(q.get("userId"));if(q.containsKey("account"))u=d.account(q.get("account"));}if(u==null)throw new ApiException(404,"当前账号不存在");return session(u,token);}
 @Transactional public Object logout(String token){d.deleteSession(Passwords.digest(token));return map("loggedOut",true);}
 @Transactional public Object change(UserEntity u,Map<String,Object>b){required(b,"密码修改信息不完整","oldPassword","newPassword");String target=str(b,"userId");if(target.isEmpty())target=u.id;if(!"admin".equals(u.role)&&!target.equals(u.id))throw new ApiException(403,"不能修改其他账号的密码");UserEntity t=d.user(target);if(t==null)throw new ApiException(404,"账号不存在");if(!passwords.verify(str(b,"oldPassword"),t.password))throw new ApiException(400,"原密码错误");d.password(t.id,passwords.hash(str(b,"newPassword")));audit(t,"修改登录密码");return t;}
 private UserEntity resetTarget(String account,String phone){UserEntity u=d.account(account.trim());if(u==null)throw new ApiException(404,"账号不存在");if(!"启用".equals(u.status))throw new ApiException(403,"账号已被停用或锁定");PersonEntity p=d.person(u.personId);if(p==null||!phone.equals(p.phone))throw new ApiException(400,"账号与绑定手机号不匹配");return u;}
 @Transactional public Object send(Map<String,Object>b,boolean reset){String p=phone(b);String purpose=reset?"reset":"register";UserEntity u=null;if(reset){if(str(b,"account").trim().isEmpty())throw new ApiException(400,"请输入需要找回密码的账号");u=resetTarget(str(b,"account"),p);}
 boolean show=demo&&"synthetic-demo".equals(profile)&&Arrays.asList(phones.split(",")).contains(p)&&(u==null||u.id.startsWith("SYN-"));
 if(demo&&!show)throw new ApiException(403,"仅允许合成白名单演示账号");if(!show&&(smsUrl.isEmpty()||smsKey.isEmpty()))throw new ApiException(503,"短信通道未配置");
 Map<String,Object>old=d.code(purpose,p);long now=System.currentTimeMillis();if(old!=null&&now-((Number)old.get("sentAt")).longValue()<60000)throw new ApiException(429,"验证码发送过于频繁，请稍后再试");String code=String.valueOf(100000+random.nextInt(900000));
 if(!show){if(!smsUrl.startsWith("https://"))throw new ApiException(503,"短信通道配置无效");try{org.springframework.http.client.SimpleClientHttpRequestFactory f=new org.springframework.http.client.SimpleClientHttpRequestFactory();f.setConnectTimeout(1500);f.setReadTimeout(2000);HttpHeaders h=new HttpHeaders();h.setBearerAuth(smsKey);h.setContentType(MediaType.APPLICATION_JSON);ResponseEntity<Void>r=new RestTemplate(f).postForEntity(smsUrl,new HttpEntity<>(map("phone",p,"code",code,"expireMinutes",5),h),Void.class);if(!r.getStatusCode().is2xxSuccessful())throw new IllegalStateException();}catch(Exception e){throw new ApiException(503,"短信发送失败");}}
 d.saveCode(map("purpose",purpose,"phone",p,"userId",u==null?null:u.id,"digest",Passwords.digest(code),"sentAt",now,"expiresAt",now+300000));return show?map("phone",p,"code",code,"expireMinutes",5):map("phone",p,"expireMinutes",5);}
 private Map<String,Object> verify(Map<String,Object>b,String purpose){String p=phone(b);Map<String,Object>c=d.code(purpose,p);if(c==null||((Number)c.get("expiresAt")).longValue()<System.currentTimeMillis())throw new ApiException(400,"验证码已过期，请重新获取");if(((Number)c.get("attempts")).intValue()>=5)throw new ApiException(429,"验证码错误次数过多，请重新获取");d.codeAttempt(purpose,p);if(!Passwords.digest(str(b,"code").trim()).equals(c.get("digest")))throw new ApiException(400,"验证码错误");return c;}
 @Transactional(noRollbackFor=ApiException.class) public Object reset(Map<String,Object>b){required(b,"密码找回信息不完整","account","phone","code","newPassword","confirmPassword");if(!str(b,"newPassword").equals(str(b,"confirmPassword")))throw new ApiException(400,"两次输入的新密码不一致");Map<String,Object>c=verify(b,"reset");UserEntity u=resetTarget(str(b,"account"),phone(b));if(!u.id.equals(c.get("userId")))throw new ApiException(400,"账号与绑定手机号不匹配");d.password(u.id,passwords.hash(str(b,"newPassword")));d.deleteUserSessions(u.id);d.deleteCode("reset",phone(b));audit(u,"找回并重置登录密码");return u;}
 private void checkBlacklist(String id){try{Map<String,Object>result=legacy.blacklist(key,map("credential",id));if(!Boolean.TRUE.equals(result.get("available")))throw new ApiException(503,"黑名单服务不可用");if(Boolean.TRUE.equals(result.get("blocked")))throw new ApiException(403,"该身份证号已在黑名单中，禁止注册访客账号");}catch(ApiException e){throw e;}catch(Exception e){throw new ApiException(503,"黑名单服务不可用");}}
 @Transactional(noRollbackFor=ApiException.class) public Object register(Map<String,Object>b){required(b,"访客注册信息不完整","name","phone","idNumber","code","password","confirmPassword");String phone=phone(b),id=str(b,"idNumber").toUpperCase().replaceAll("\\\\s+","");if(!id.matches("[0-9]{17}[0-9X]"))throw new ApiException(400,"请输入完整的 18 位身份证号码");if(!str(b,"password").equals(str(b,"confirmPassword")))throw new ApiException(400,"两次输入的密码不一致");verify(b,"register");if(d.account(phone)!=null)throw new ApiException(409,"该手机号已注册，请直接登录");checkBlacklist(id);PersonEntity p=new PersonEntity();p.id="SYN-P-VIS-"+UUID.randomUUID();p.name=str(b,"name");p.type="访客";p.code="VIS"+UUID.randomUUID();p.idNumber=id;p.role="visitor";p.phone=phone;p.company=str(b,"company");p.status="正常";UserEntity u=new UserEntity();u.id="SYN-U-VIS-"+UUID.randomUUID();u.username=phone;u.accountType="手机号";u.password=passwords.hash(str(b,"password"));u.role="visitor";u.personId=p.id;u.status="启用";d.insertPerson(p);d.insertUser(u);audit(u,"注册访客账号");d.deleteCode("register",phone);return map("registered",true,"phone",phone,"user",u,"person",p);}
 public Object projection(){return map("users",d.users(),"people",d.people(),"sessions",Collections.emptyList(),"configuration",roles());}
}
''')
java('controller/AuthController','''package edu.hfut.campus.controller;
import org.springframework.web.bind.annotation.*;import org.springframework.http.*;import javax.servlet.http.HttpServletRequest;import java.util.*;import edu.hfut.campus.service.AuthService;import edu.hfut.campus.entity.UserEntity;import edu.hfut.campus.security.Authentication;import static edu.hfut.campus.dto.Responses.*;
@RestController @RequestMapping("/api/auth") public class AuthController {private final AuthService s;public AuthController(AuthService s){this.s=s;}
 @PostMapping("/login")public Object login(@RequestBody Map<String,Object>b){return ok(s.login(b));}
 @PostMapping("/logout")public Object logout(HttpServletRequest r){return ok(s.logout(Authentication.token(r)));}
 @GetMapping("/me")public Object me(HttpServletRequest r,@RequestParam Map<String,String>q){return ok(s.me((UserEntity)r.getAttribute("identity"),Authentication.token(r),q));}
 @PatchMapping("/password")public Object password(HttpServletRequest r,@RequestBody Map<String,Object>b){return ok(s.change((UserEntity)r.getAttribute("identity"),b));}
 @PostMapping("/send-code")public Object send(@RequestBody Map<String,Object>b){return ok(s.send(b,false));}
 @PostMapping("/reset-code")public Object resetCode(@RequestBody Map<String,Object>b){return ok(s.send(b,true));}
 @PostMapping("/reset-password")public Object reset(@RequestBody Map<String,Object>b){return ok(s.reset(b));}
 @PostMapping("/register-visitor")public ResponseEntity<?> register(@RequestBody Map<String,Object>b){return ResponseEntity.status(201).body(ok(s.register(b)));}
}
''')
java('controller/RoleController','''package edu.hfut.campus.controller;import org.springframework.web.bind.annotation.*;import edu.hfut.campus.service.AuthService;import static edu.hfut.campus.dto.Responses.*;
@RestController public class RoleController{private final AuthService s;public RoleController(AuthService s){this.s=s;}@GetMapping("/api/roles")public Object roles(){return ok(s.roles());}}
''')
java('controller/InternalController','''package edu.hfut.campus.controller;
import org.springframework.web.bind.annotation.*;import javax.servlet.http.HttpServletRequest;import edu.hfut.campus.security.*;import edu.hfut.campus.service.AuthService;import edu.hfut.campus.entity.*;import edu.hfut.campus.dao.UserMapper;import static edu.hfut.campus.dto.Responses.*;
@RestController @RequestMapping("/internal") public class InternalController{private final SessionAuthority auth;private final AuthService s;private final UserMapper d;public InternalController(SessionAuthority a,AuthService s,UserMapper d){auth=a;this.s=s;this.d=d;}
 @GetMapping("/session")public Object session(HttpServletRequest r){UserEntity u=auth.resolve(Authentication.token(r));return map("user",u,"role",u.role,"personId",u.personId,"person",d.person(u.personId));}
 @GetMapping("/projection")public Object projection(){return s.projection();}
}
''')
print('Created formal Maven project (batch 1); P1 untouched')
