package edu.hfut.campus.service.impl;
import java.util.*;
import java.time.*;
import java.lang.reflect.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import edu.hfut.campus.dao.*;
import edu.hfut.campus.entity.*;
import edu.hfut.campus.service.AdminService;
import edu.hfut.campus.security.Passwords;
import edu.hfut.campus.client.LegacyClient;
import edu.hfut.campus.exception.ApiException;
import static edu.hfut.campus.dto.Responses.*;
@Service public class AdminServiceImpl implements AdminService  {
  private final UserMapper d;
  private final DomainMapper m;
  private final Passwords passwords;
  private final LegacyClient legacy;
  @Value("${P2_INTERNAL_KEY}")String key;
  static final Set<String> ROLES=new HashSet<>(Arrays.asList("student","teacher","visitor","alumni","guard","admin")),TYPES=new HashSet<>(Arrays.asList("账号","学号","工号","手机号","校友编号"));
  public AdminServiceImpl(UserMapper d,DomainMapper m,Passwords p,LegacyClient l)  {
    this.d=d;
    this.m=m;
    passwords=p;
    legacy=l;
  }
  private void required(Map<String,Object>b,String message,String...keys)  {
    List<String>missing=new ArrayList<>();
    for(String k:keys)if(str(b,k).trim().isEmpty())missing.add(k);
    if(!missing.isEmpty())throw new ApiException(400,message,map("missing",missing));
  }
  private String normalized(String value,String type)  {
    if("手机号".equals(type))return value.replaceAll("[^0-9]","").substring(0,Math.min(11,value.replaceAll("[^0-9]","").length()));
    if("学号".equals(type))return value.replaceAll("[^0-9]","");
    return value.trim().toUpperCase(Locale.ROOT);
  }
  private void validUser(Map<String,Object>b,String type,boolean partial)  {
    if(!TYPES.contains(type))throw new ApiException(400,"账号类型不正确");
    if(!partial||b.containsKey("username"))  {
      String v=normalized(str(b,"username"),type),regex="手机号".equals(type)?"1[0-9]{10}":"学号".equals(type)?"[0-9]{6,20}":"工号".equals(type)?"[A-Z0-9-]{4,20}":"[A-Z0-9-]{4,24}";
      if(!v.matches(regex))throw new ApiException(400,"登录账号格式不正确");
    }
    if(b.containsKey("role")&&!ROLES.contains(str(b,"role")))throw new ApiException(400,"角色不正确");
    if(b.containsKey("password")&&(str(b,"password").length()<6||str(b,"password").length()>32))throw new ApiException(400,"密码长度需为 6-32 位");
  }
  public Object users(UserEntity a,String role)  {
    ProfileServiceImpl.admin(a);
    List<edu.hfut.campus.dto.SafeUser>out=new ArrayList<>();
    for(UserEntity u:m.users())if(role==null||role.isEmpty()||role.equals(u.role))out.add(new edu.hfut.campus.dto.SafeUser(u));
    return map("success",true,"data",out,"total",out.size());
  }
  @Transactional public Object createUser(UserEntity a,Map<String,Object>b)  {
    ProfileServiceImpl.admin(a);
    String type=b.containsKey("accountType")?str(b,"accountType"):"账号";
    required(b,"用户信息不完整","username","password","role","personId");
    validUser(b,type,false);
    if(d.person(str(b,"personId"))==null)throw new ApiException(404,"绑定人员不存在");
    String name=normalized(str(b,"username"),type);
    if(d.account(name)!=null)throw new ApiException(409,"账号已存在");
    UserEntity u=new UserEntity();
    u.id=str(b,"id").isEmpty()?"SYN-U-"+UUID.randomUUID():str(b,"id");
    u.username=name;
    u.accountType=type;
    u.password=passwords.hash(str(b,"password"));
    u.role=str(b,"role");
    u.personId=str(b,"personId");
    u.status=str(b,"status").isEmpty()?"启用":str(b,"status");
    d.insertUser(u);
    return new edu.hfut.campus.dto.SafeUser(u);
  }
  @Transactional public Object updateUser(UserEntity a,String id,Map<String,Object>b)  {
    ProfileServiceImpl.admin(a);
    UserEntity u=d.lockUser(id);
    if(u==null)throw new ApiException(404,"用户不存在");
    String type=str(b,"accountType").isEmpty()?(u.accountType==null?"账号":u.accountType):str(b,"accountType");
    validUser(b,type,true);
    if(b.containsKey("username"))  {
      String name=normalized(str(b,"username"),type);
      UserEntity old=d.account(name);
      if(old!=null&&!old.id.equals(id))throw new ApiException(409,"账号已存在");
      u.username=name;
    }
    if(b.containsKey("personId"))  {
      if(d.person(str(b,"personId"))==null)throw new ApiException(404,"绑定人员不存在");
      u.personId=str(b,"personId");
    }
    u.accountType=type;
    if(b.containsKey("role"))u.role=str(b,"role");
    if(b.containsKey("status"))u.status=str(b,"status");
    if(b.containsKey("password"))u.password=passwords.hash(str(b,"password"));
    m.updateUser(u);
    return new edu.hfut.campus.dto.SafeUser(u);
  }
  private String fieldLabel(String f)  {
    return Map.of("phone","电话","college","学院","className","班级","company","来访单位","host","被访人","gate","值守校门","department","所属部门").getOrDefault(f,f);
  }
  private void blacklist(String id)  {
    try  {
      Map<String,Object>r=legacy.blacklist(key,map("credential",id));
      if(!Boolean.TRUE.equals(r.get("available")))throw new ApiException(503,"黑名单服务不可用");
      if(Boolean.TRUE.equals(r.get("blocked")))throw new ApiException(403,"该身份证号已在黑名单中，禁止录入访客");
    }
    catch(ApiException e)  {
      throw e;
    }
    catch(Exception e)  {
      throw new ApiException(503,"黑名单服务不可用");
    }
  }
  @Transactional public Object person(UserEntity a,String id,Map<String,Object>b)  {
    ProfileServiceImpl.admin(a);
    boolean create=id==null;
    if(create)required(b,"人员信息不完整","name","type","role","code","idNumber","phone");
    PersonEntity p=create?new PersonEntity():d.lockPerson(id);
    if(p==null)throw new ApiException(404,"人员不存在");
    String type=b.containsKey("type")?str(b,"type").trim():p.type;
    Map<String,String>typeRole=new LinkedHashMap<>();
    String[]labels=  {
      "学生","教职工","访客","校友","门岗安保","管理员"
    }
    ,roles=  {
      "student","teacher","visitor","alumni","guard","admin"
    }
    ;
    for(int i=0;i<6;i++)typeRole.put(labels[i],roles[i]);
    if(!typeRole.containsKey(type))throw new ApiException(400,"人员类型不正确");
    if(create)required(b,"人员信息不完整","name","type","role","code","idNumber","phone");
    Map<String,Object>next=new LinkedHashMap<>(b);
    if(next.containsKey("code"))next.put("code","学生".equals(type)?str(next,"code").replaceAll("[^0-9]",""):str(next,"code").trim().toUpperCase(Locale.ROOT));
    if(next.containsKey("idNumber"))next.put("idNumber",str(next,"idNumber").trim().toUpperCase(Locale.ROOT));
    if(next.containsKey("phone"))next.put("phone",normalized(str(next,"phone"),"手机号"));
    if(next.containsKey("role")&&!typeRole.get(type).equals(str(next,"role")))throw new ApiException(400,"人员类型和角色不匹配");
    for(Field f:PersonEntity.class.getFields())try  {
      if(!f.getName().equals("id")&&!f.getName().equals("faceStatus")&&next.containsKey(f.getName()))f.set(p,str(next,f.getName()).trim());
      else if(create&&f.get(p)==null)f.set(p,"");
    }
    catch(IllegalAccessException e)  {
      throw new IllegalStateException();
    }
    if(next.containsKey("type")&&!typeRole.get(type).equals(p.role))throw new ApiException(400,"人员类型和角色不匹配");
    if(create||next.containsKey("type")||next.containsKey("name"))if(!p.name.matches("[\\u4e00-\\u9fa5A-Za-z·.\\s]{2,30}"))throw new ApiException(400,"姓名需为 2-30 位中文或英文字母");
    if(create||next.containsKey("code")||next.containsKey("type"))  {
      String regex="学生".equals(type)?"[0-9]{6,20}":"访客".equals(type)?"VIS[A-Z0-9-]{4,21}":"校友".equals(type)?"[A-Z0-9-]{4,24}":"[A-Z0-9-]{4,20}";
      if(!p.code.matches(regex))  {
        String codeLabel="学生".equals(type)?"学号/编号":"访客".equals(type)?"访客编号":"校友".equals(type)?"校友编号":"工号/编号",hint="学生".equals(type)?"6-20 位数字学号":"访客".equals(type)?"VIS 开头，7-24 位大写字母/数字/短横线":"校友".equals(type)?"4-24 位大写字母/数字/短横线":"4-20 位大写字母/数字/短横线";
        throw new ApiException(400,codeLabel+"格式不正确："+hint);
      }
    }
    if(create||next.containsKey("type")||next.containsKey("idNumber"))  {
      try  {
        if(!p.idNumber.matches("[0-9]{17}[0-9X]"))throw new IllegalArgumentException();
        if(Integer.parseInt(p.idNumber.substring(6,10))<100)throw new IllegalArgumentException();
        LocalDate.of(Integer.parseInt(p.idNumber.substring(6,10)),Integer.parseInt(p.idNumber.substring(10,12)),Integer.parseInt(p.idNumber.substring(12,14)));
      }
      catch(Exception e)  {
        throw new ApiException(400,"身份证号需为 18 位有效身份证格式");
      }
    }
    if(create||next.containsKey("type")||next.containsKey("phone"))if(!p.phone.matches("1[0-9]{10}"))throw new ApiException(400,"联系电话必须为 11 位有效手机号");
    if(create||next.containsKey("type"))  {
      String[]required="学生".equals(type)?new String[]  {
        "college","className"
      }
      :"教职工".equals(type)||"校友".equals(type)?new String[]  {
        "college"
      }
      :"访客".equals(type)?new String[]  {
        "phone","company","host"
      }
      :"门岗安保".equals(type)?new String[]  {
        "gate"
      }
      :new String[]  {
        "department"
      }
      ;
      for(String field:required)try  {
        if(String.valueOf(PersonEntity.class.getField(field).get(p)).trim().isEmpty())throw new ApiException(400,"请填写"+fieldLabel(field));
      }
      catch(ReflectiveOperationException e)  {
        throw new IllegalStateException();
      }
    }
    String[]names=  {
      "name","college","className","department","position","host","company","graduationYear","major","gate"
    }
    ;
    int[]limits=  {
      30,40,30,40,30,30,60,4,40,10
    }
    ;
    for(int i=0;i<names.length;i++)try  {
      Object v=PersonEntity.class.getField(names[i]).get(p);
      if(next.containsKey(names[i])&&v!=null&&v.toString().length()>limits[i])throw new ApiException(400,fieldLabel(names[i])+"不能超过 "+limits[i]+" 个字符");
    }
    catch(ReflectiveOperationException e)  {
      throw new IllegalStateException();
    }
    if(next.containsKey("graduationYear")&&!str(next,"graduationYear").isEmpty())  {
      String y=str(next,"graduationYear");
      if(!y.matches("[0-9]{4}")||Integer.parseInt(y)<1950||Integer.parseInt(y)>Year.now().getValue())throw new ApiException(400,"毕业年份需在 1950-"+Year.now().getValue()+" 年之间");
    }
    for(PersonEntity old:d.people())if(old.code!=null&&old.code.equals(p.code)&&!old.id.equals(id))throw new ApiException(409,"人员编号已存在");
    if("visitor".equals(p.role)&&(create||next.containsKey("idNumber")||next.containsKey("role")||next.containsKey("type")))blacklist(p.idNumber);
    if("访客".equals(type)&&(create||next.containsKey("host")||next.containsKey("type")))  {
      PersonEntity host=null;
      for(PersonEntity h:d.people())if(!h.id.equals(id)&&Arrays.asList("student","teacher","admin").contains(h.role)&&(h.id.equals(p.host)||h.name.equals(p.host)||h.code.equals(p.host)))  {
        host=h;
        break;
      }
      if(host==null)throw new ApiException(400,"访客被访人必须是系统中的学生、教职工或保卫处管理员");
      p.host=host.name;
    }
    if(create)  {
      p.id=str(b,"id").isEmpty()?"SYN-P-"+UUID.randomUUID():str(b,"id");
      if(p.status==null||p.status.isEmpty())p.status="正常";
      p.faceStatus=null;
      m.createPerson(p);
    }
    else m.updatePerson(p);
    return create?new edu.hfut.campus.dto.PersonCreated(p):p;
  }
}
