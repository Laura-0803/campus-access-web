package edu.hfut.campus.service.impl;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import edu.hfut.campus.service.ProfileService;
import edu.hfut.campus.dao.UserMapper;
import edu.hfut.campus.entity.*;
import edu.hfut.campus.exception.ApiException;
import static edu.hfut.campus.dto.Responses.*;
@Service public class ProfileServiceImpl implements ProfileService  {
  private final UserMapper d;
  public ProfileServiceImpl(UserMapper d)  {
    this.d=d;
  }
  public static void admin(UserEntity actor)  {
    if(!"admin".equals(actor.role))throw new ApiException(403,"当前角色无权访问该接口");
  }
  @Transactional public Object profile(UserEntity actor,String role,Map<String,String>q,Map<String,Object>b,boolean update)  {
    if(!"me".equals(role))admin(actor);
    if(update&&b.containsKey("phone")&&!str(b,"phone").trim().matches("1[0-9]{10}"))throw new ApiException(400,"联系电话必须为 11 位有效手机号");
    UserEntity u=actor;
    if("admin".equals(actor.role))  {
      String target=q.getOrDefault("userId",str(b,"userId"));
      u=null;
      if(!target.isEmpty())u=d.user(target);
      else if(!"me".equals(role))for(UserEntity candidate:d.users())if(role.equals(candidate.role))  {
        u=candidate;
        break;
      }
    }
    if(u==null)throw new ApiException(404,"me".equals(role)?"账号资料不存在":"角色资料不存在");
    PersonEntity p=update?d.lockPerson(u.personId):d.person(u.personId);
    if(update)  {
      if(p==null)throw new ApiException(404,"me".equals(role)?"账号资料不存在":"角色资料不存在");
      if(b.containsKey("phone"))p.phone=str(b,"phone").trim();
      if("me".equals(role)&&"visitor".equals(u.role)&&b.containsKey("company"))p.company=str(b,"company");
      if(!"me".equals(role)&&b.containsKey("status"))p.status=str(b,"status");
      d.updateContact(p);
    }
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
        case "student":t=p.className+" · "+p.college;
        break;
        case "teacher":t=p.department+" · "+p.position;
        break;
        case "alumni":t=p.graduationYear+" 届 · "+p.college;
        break;
        case "guard":t=p.gate+" · "+p.department;
        break;
        case "admin":t=p.department;
      }
      base.put("title",t);
    }
    return map("user",new edu.hfut.campus.dto.SafeUser(u),"profile",base,"person",p);
  }
  public Object people(UserEntity actor,Map<String,String>q)  {
    admin(actor);
    List<PersonEntity>p=d.searchPeople(q);
    return map("success",true,"data",p,"total",p.size());
  }
  public Object person(UserEntity actor,String id)  {
    admin(actor);
    PersonEntity p=d.person(id);
    if(p==null)throw new ApiException(404,"人员不存在");
    return ok(p);
  }
}
