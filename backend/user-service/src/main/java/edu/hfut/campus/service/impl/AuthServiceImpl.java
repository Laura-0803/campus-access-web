package edu.hfut.campus.service.impl;
import java.util.*;
import java.time.*;
import java.time.format.*;
import java.security.SecureRandom;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import edu.hfut.campus.service.AuthService;
import edu.hfut.campus.dao.*;
import edu.hfut.campus.entity.*;
import edu.hfut.campus.security.*;
import edu.hfut.campus.exception.*;
import edu.hfut.campus.client.*;
import static edu.hfut.campus.dto.Responses.*;
@Service public class AuthServiceImpl implements AuthService  {
  private final UserMapper d;
  private final Passwords passwords;
  private final LegacyClient legacy;
  private final SecureRandom random=new SecureRandom();
  @Value("${P2_INTERNAL_KEY}")String key;
  @Value("${P2_DEMO:false}")boolean demo;
  @Value("${spring.profiles.active:}")String profile;
  @Value("${P2_DEMO_PHONES:}")String phones;
  @Value("${P2_SMS_URL:}")String smsUrl;
  @Value("${P2_SMS_KEY:}")String smsKey;
  public AuthServiceImpl(UserMapper d,Passwords p,LegacyClient l)  {
    this.d=d;
    passwords=p;
    legacy=l;
  }
  private void required(Map<String,Object>b,String message,String...names)  {
    List<String> missing=new ArrayList<>();
    for(String n:names)if(str(b,n).trim().isEmpty())missing.add(n);
    if(!missing.isEmpty())throw new ApiException(400,message,map("missing",missing));
  }
  private String phone(Map<String,Object>b)  {
    String p=str(b,"phone").trim();
    if(!p.matches("1[0-9]{10}"))throw new ApiException(400,"请输入 11 位有效手机号");
    return p;
  }
  private String roleLabel(String role)  {
    for(RoleEntity r:d.roles())if(role.equals(r.roleKey))return r.label;
    return role;
  }
  private void auditRegistration(UserEntity u,PersonEntity p)  {
    d.audit(map("id","L"+UUID.randomUUID(),"time",LocalDateTime.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),"actor",p.name,"role","访客","action","注册访客账号","target",p.phone));
  }
  private void audit(UserEntity u,String action)  {
    d.audit(map("id","L"+UUID.randomUUID(),"time",LocalDateTime.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),"actor",u.username,"role",roleLabel(u.role),"action",action,"target",u.id));
  }
  public Object roles()  {
    Map<String,Object>roles=new LinkedHashMap<>(),profiles=new LinkedHashMap<>();
    for(RoleEntity r:d.roles())roles.put(r.roleKey,r.label);
    for(RoleProfileEntity r:d.profiles())profiles.put(r.roleKey,profileMap(r));
    return map("roles",roles,"roleProfiles",profiles);
  }
  private Object session(UserEntity u,String token)  {
    PersonEntity p=d.person(u.personId);
    Map<String,Object>base=new LinkedHashMap<>();
    for(RoleProfileEntity r:d.profiles())if(u.role.equals(r.roleKey))base.putAll(profileMap(r));
    base.remove("roleKey");
    base.put("personId",u.personId);
    base.put("role",u.role);
    if(p!=null)  {
      base.put("name",p.name);
      base.put("type",p.type);
      base.put("status",p.status);
      String t=p.company==null||p.company.isEmpty()?"访客用户":p.company;
      switch(u.role)  {
        case "student":t=p.className+" / "+p.college;
        break;
        case "teacher":t=p.department+" / "+p.position;
        break;
        case "alumni":t=p.graduationYear+" 届 / "+p.college;
        break;
        case "guard":t=p.gate+" / "+p.department;
        break;
        case "admin":t=p.department;
      }
      base.put("title",t);
    }
    return map("token",token,"user",new edu.hfut.campus.dto.SafeUser(u),"profile",base,"person",p);
  }
  @Transactional public Object login(Map<String,Object>b)  {
    String account=str(b,"account");
    if(account.isEmpty())account=str(b,"username");
    if(account.trim().isEmpty())throw new ApiException(400,"请输入学号、工号、校友编号或手机号");
    UserEntity u=d.account(account.trim());
    if(u==null)throw new ApiException(401,"账号不存在");
    u=d.lockUser(u.id);
    if(!passwords.verify(str(b,"password"),u.password))throw new ApiException(401,"密码错误");
    if(!"启用".equals(u.status))throw new ApiException(403,"账号已被停用或锁定");
    String token=UUID.randomUUID().toString();
    Instant now=Instant.now();
    d.insertSession(map("token",Passwords.digest(token),"userId",u.id,"role",u.role,"createdAt",now.toString(),"expiresAt",now.plusSeconds(28800).toString()));
    audit(u,"登录系统");
    return session(u,token);
  }
  public Object me(UserEntity u,String token,Map<String,String>q)  {
    if("admin".equals(u.role))  {
      if(q.containsKey("userId"))u=d.user(q.get("userId"));
      if(q.containsKey("account"))u=d.account(q.get("account"));
    }
    if(u==null)throw new ApiException(404,"当前账号不存在");
    return session(u,token);
  }
  @Transactional public Object logout(String token)  {
    d.deleteSession(Passwords.digest(token));
    return map("loggedOut",true);
  }
  @Transactional public Object change(UserEntity u,Map<String,Object>b)  {
    required(b,"密码修改信息不完整","oldPassword","newPassword");
    String target=str(b,"userId");
    if(target.isEmpty())target=u.id;
    if(!"admin".equals(u.role)&&!target.equals(u.id))throw new ApiException(403,"不能修改其他账号的密码");
    UserEntity t=d.lockUser(target);
    if(t==null)throw new ApiException(404,"账号不存在");
    if(!passwords.verify(str(b,"oldPassword"),t.password))throw new ApiException(400,"原密码错误");
    d.password(t.id,passwords.hash(str(b,"newPassword")));
    audit(t,"修改登录密码");
    return new edu.hfut.campus.dto.SafeUser(t);
  }
  private UserEntity resetTarget(String account,String phone)  {
    UserEntity u=d.account(account.trim());
    if(u==null)throw new ApiException(404,"账号不存在");
    if(!"启用".equals(u.status))throw new ApiException(403,"账号已被停用或锁定");
    PersonEntity p=d.person(u.personId);
    if(p==null||!phone.equals(p.phone))throw new ApiException(400,"账号与绑定手机号不匹配");
    return u;
  }
  @Transactional public Object send(Map<String,Object>b,boolean reset)  {
    String p=phone(b);
    String purpose=reset?"reset":"register";
    UserEntity u=null;
    if(reset)  {
      if(str(b,"account").trim().isEmpty())throw new ApiException(400,"请输入需要找回密码的账号");
      u=resetTarget(str(b,"account"),p);
    }
    boolean show=demo&&"synthetic-demo".equals(profile)&&Arrays.asList(phones.split(",")).contains(p)&&(u==null||u.id.startsWith("SYN-"));
    if(demo&&!show)throw new ApiException(403,"仅允许合成白名单演示账号");
    if(!show&&(smsUrl.isEmpty()||smsKey.isEmpty()))throw new ApiException(503,"短信通道未配置");
    VerificationCodeEntity old=d.code(purpose,p);
    long now=System.currentTimeMillis();
    if(old!=null&&now-old.sentAt<60000)throw new ApiException(429,"验证码发送过于频繁，请稍后再试");
    String code=String.valueOf(100000+random.nextInt(900000));
    if(!show)  {
      if(!smsUrl.startsWith("https://"))throw new ApiException(503,"短信通道配置无效");
      try  {
        org.springframework.http.client.SimpleClientHttpRequestFactory f=new org.springframework.http.client.SimpleClientHttpRequestFactory();
        f.setConnectTimeout(1500);
        f.setReadTimeout(2000);
        HttpHeaders h=new HttpHeaders();
        h.setBearerAuth(smsKey);
        h.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Void>r=new RestTemplate(f).postForEntity(smsUrl,new HttpEntity<>(map("phone",p,"code",code,"expireMinutes",5),h),Void.class);
        if(!r.getStatusCode().is2xxSuccessful())throw new IllegalStateException();
      }
      catch(Exception e)  {
        throw new ApiException(503,"短信发送失败");
      }
    }
    d.saveCode(map("purpose",purpose,"phone",p,"userId",u==null?null:u.id,"digest",Passwords.digest(code),"sentAt",now,"expiresAt",now+300000));
    return show?map("phone",p,"code",code,"expireMinutes",5):map("phone",p,"expireMinutes",5);
  }
  private VerificationCodeEntity verify(Map<String,Object>b,String purpose)  {
    String p=phone(b);
    VerificationCodeEntity c=d.code(purpose,p);
    if(c==null||c.expiresAt<System.currentTimeMillis())throw new ApiException(400,"验证码已过期，请重新获取");
    if(c.attempts>=5)throw new ApiException(429,"验证码错误次数过多，请重新获取");
    d.codeAttempt(purpose,p);
    if(!Passwords.digest(str(b,"code").trim()).equals(c.digest))throw new ApiException(400,"验证码错误");
    return c;
  }
  @Transactional(noRollbackFor=ApiException.class) public Object reset(Map<String,Object>b)  {
    required(b,"密码找回信息不完整","account","phone","code","newPassword","confirmPassword");
    if(!str(b,"newPassword").equals(str(b,"confirmPassword")))throw new ApiException(400,"两次输入的新密码不一致");
    VerificationCodeEntity c=verify(b,"reset");
    UserEntity u=resetTarget(str(b,"account"),phone(b));
    if(!u.id.equals(c.userId))throw new ApiException(400,"账号与绑定手机号不匹配");
    d.password(u.id,passwords.hash(str(b,"newPassword")));
    d.deleteUserSessions(u.id);
    d.deleteCode("reset",phone(b));
    audit(u,"找回并重置登录密码");
    return new edu.hfut.campus.dto.SafeUser(u);
  }
  private void checkBlacklist(String id)  {
    try  {
      Map<String,Object>result=legacy.blacklist(key,map("credential",id));
      if(!Boolean.TRUE.equals(result.get("available")))throw new ApiException(503,"黑名单服务不可用");
      if(Boolean.TRUE.equals(result.get("blocked")))throw new ApiException(403,"该身份证号已在黑名单中，禁止注册访客账号");
    }
    catch(ApiException e)  {
      throw e;
    }
    catch(Exception e)  {
      throw new ApiException(503,"黑名单服务不可用");
    }
  }
  @Transactional(noRollbackFor=ApiException.class) public Object register(Map<String,Object>b)  {
    required(b,"访客注册信息不完整","name","phone","idNumber","code","password","confirmPassword");
    String phone=phone(b),id=str(b,"idNumber").toUpperCase().replaceAll("\\s+","");
    if(!id.matches("[0-9]{17}[0-9X]"))throw new ApiException(400,"请输入完整的 18 位身份证号码");
    if(!str(b,"password").equals(str(b,"confirmPassword")))throw new ApiException(400,"两次输入的密码不一致");
    verify(b,"register");
    if(d.account(phone)!=null)throw new ApiException(409,"该手机号已注册，请直接登录");
    checkBlacklist(id);
    PersonEntity p=new PersonEntity();
    p.id="SYN-P-VIS-"+UUID.randomUUID();
    p.name=str(b,"name");
    p.type="访客";
    p.code="VIS"+UUID.randomUUID().toString().replace("-","").substring(0,20).toUpperCase(Locale.ROOT);
    p.idNumber=id;
    p.role="visitor";
    p.phone=phone;
    p.company=str(b,"company");
    p.status="正常";
    UserEntity u=new UserEntity();
    u.id="SYN-U-VIS-"+UUID.randomUUID();
    u.username=phone;
    u.accountType="手机号";
    u.password=passwords.hash(str(b,"password"));
    u.role="visitor";
    u.personId=p.id;
    u.status="启用";
    d.insertPerson(p);
    d.insertUser(u);
    auditRegistration(u,p);
    d.deleteCode("register",phone);
    return map("registered",true,"phone",phone,"user",new edu.hfut.campus.dto.SafeUser(u),"person",map("id",p.id,"name",p.name,"type",p.type,"code",p.code,"idNumber",p.idNumber,"role",p.role,"phone",p.phone,"company",p.company,"status",p.status));
  }
  public Object projection()  {
    return map("users",d.users(),"people",d.people(),"sessions",Collections.emptyList(),"configuration",roles(),"faces",d.faces(),"vehicles",d.vehicles(),"messages",d.messages(),"logs",d.logs());
  }
}
