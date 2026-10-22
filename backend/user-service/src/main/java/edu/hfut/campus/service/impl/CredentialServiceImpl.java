package edu.hfut.campus.service.impl;
import java.util.*;
import java.time.*;
import java.time.format.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import edu.hfut.campus.dao.*;
import edu.hfut.campus.entity.*;
import edu.hfut.campus.service.CredentialService;
import edu.hfut.campus.exception.ApiException;
import static edu.hfut.campus.dto.Responses.*;
@Service public class CredentialServiceImpl implements CredentialService  {
  private final UserMapper d;
  private final DomainMapper m;
  public CredentialServiceImpl(UserMapper d,DomainMapper m)  {
    this.d=d;
    this.m=m;
  }
  private void allowed(UserEntity u,boolean faces)  {
    if(!Arrays.asList(faces?new String[]  {
      "student","teacher","admin"
    }
    :new String[]  {
      "teacher","admin"
    }
    ).contains(u.role))throw new ApiException(403,"当前角色无权访问该接口");
  }
  private String target(UserEntity u,Map<String,String>q,Map<String,Object>b)  {
    if(!"admin".equals(u.role)) {
      if(u.personId==null||u.personId.isEmpty()||d.person(u.personId)==null)throw new ApiException(404,"账号资料不存在");
      return u.personId;
    }
    String id=q.getOrDefault("userId",str(b,"userId"));
    if(!id.isEmpty())  {
      UserEntity x=d.user(id);
      return x==null?null:x.personId;
    }
    id=q.getOrDefault("personId",str(b,"personId"));
    if(!id.isEmpty())return id;
    String role=q.getOrDefault("role",str(b,"role"));
    for(RoleProfileEntity p:d.profiles())if(role.equals(p.roleKey))return p.personId;
    return null;
  }
  private String slot(String s)  {
    return "secondary".equalsIgnoreCase(s)?"secondary":"primary";
  }
  private String label(String s)  {
    return "secondary".equals(s)?"照片二（夜间/戴口罩）":"照片一（白天/不戴口罩）";
  }
  public Object faces(UserEntity u,Map<String,String>q)  {
    allowed(u,true);
    String p=target(u,q,Collections.emptyMap());
    List<FaceEntity>out=new ArrayList<>();
    int i=0;
    for(FaceEntity f:m.faces())if(p==null||p.equals(f.personId))  {
      int index=i++;
      f.slot=f.slot==null?(index==1?"secondary":"primary"):slot(f.slot);
      if(f.label==null||f.label.isEmpty())f.label=label(f.slot);
      out.add(f);
    }
    if(p!=null)out.sort(Comparator.comparing(f->"primary".equals(f.slot)?0:1));
    return map("success",true,"data",out,"total",out.size());
  }
  @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED) public Object upload(UserEntity u,Map<String,String>q,Map<String,Object>b)  {
    allowed(u,true);
    String personId=target(u,q,b);
    PersonEntity p=d.lockPerson(personId);
    if(p==null)throw new ApiException(404,"人员不存在，无法上传人脸照片");
    String slot=slot(str(b,"slot"));
    List<FaceEntity>all=m.faces();
    FaceEntity f=null;
    int count=0;
    for(FaceEntity v:all)if(personId.equals(v.personId))  {
      count++;
      if(f==null&&slot.equals(slot(v.slot)))f=v;
    }
    boolean fresh=f==null;
    if(fresh&&count>=2)throw new ApiException(400,"每人最多上传 2 张人脸照片");
    if(fresh)  {
      f=new FaceEntity();
      f.id="F"+UUID.randomUUID();
      f.personId=p.id;
      f.personName=p.name;
    }
    f.status="已上传";
    f.fileName=str(b,"fileName").isEmpty()?"face-photo.jpg":str(b,"fileName");
    f.imageUrl=str(b,"imageUrl").isEmpty()?(f.imageUrl==null?"":f.imageUrl):str(b,"imageUrl");
    f.slot=slot;
    f.label=str(b,"label").isEmpty()?label(slot):str(b,"label");
    f.updatedAt=LocalDateTime.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    if(fresh)m.insertFace(f);
    else m.updateFace(f);
    p.faceStatus="已上传";
    m.updatePerson(p);
    return f;
  }
  public Object vehicles(UserEntity u,Map<String,String>q)  {
    allowed(u,false);
    String person=target(u,q,Collections.emptyMap());
    List<VehicleEntity>out=new ArrayList<>();
    for(VehicleEntity v:m.vehicles())if(person==null||person.equals(v.ownerId))out.add(v);
    return map("success",true,"data",out,"total",out.size());
  }
  private String plate(String value)  {
    String compact=value.trim().toUpperCase(Locale.ROOT).replaceAll("[·\\s.-]","");
    if(!compact.matches("[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼][A-Z][A-Z0-9]{5,6}"))throw new ApiException(400,"请输入有效车牌号");
    String letters=PlateLetters.VALUES.get(compact.substring(0,1));
    if(letters==null||letters.indexOf(compact.charAt(1))<0)throw new ApiException(400,"请输入有效车牌号");
    return compact.substring(0,2)+"·"+compact.substring(2);
  }
  @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED) public Object vehicle(UserEntity u,String id,Map<String,Object>b,boolean delete)  {
    allowed(u,false);
    boolean create=id==null;
    VehicleEntity v=create?new VehicleEntity():m.vehicle(id);
    if(v==null)throw new ApiException(404,"车辆不存在");
    if(!create&&!"admin".equals(u.role)&&!u.personId.equals(v.ownerId))throw new ApiException(403,delete?"无权删除其他人的车辆":"无权修改其他人的车辆");
    if(delete)  {
      m.deleteVehicle(id);
      return v;
    }
    if(create)  {
      List<String>missing=new ArrayList<>();
      if("admin".equals(u.role)&&str(b,"ownerId").isEmpty())missing.add("ownerId");
      if(str(b,"plateNo").isEmpty())missing.add("plateNo");
      if(!missing.isEmpty())throw new ApiException(400,"车辆信息不完整",map("missing",missing));
      v.id="V"+UUID.randomUUID();
      v.ownerId="admin".equals(u.role)?str(b,"ownerId"):u.personId;
      v.status=str(b,"status").isEmpty()?"正常":str(b,"status");
      v.lastAccess=str(b,"lastAccess").isEmpty()?"暂无":str(b,"lastAccess");
    }
    if(create||b.containsKey("plateNo"))  {
      v.plateNo=plate(str(b,"plateNo"));
      for(VehicleEntity old:m.vehicles())if(!old.id.equals(v.id)&&old.plateNo.equals(v.plateNo))throw new ApiException(409,"车牌号已登记");
    }
    if(!create&&"admin".equals(u.role)&&b.containsKey("ownerId"))v.ownerId=str(b,"ownerId");
    PersonEntity owner=d.lockPerson(v.ownerId);
    if(owner==null)throw new ApiException(404,create?"车主不存在":"新车主不存在");
    int n=m.vehicleCount(v.ownerId,v.id);
    if(n>=2)throw new ApiException(400,"每位老师最多只能登记 2 辆车");
    v.ownerName=owner.name;
    if(!create)  {
      if(b.containsKey("status"))v.status=str(b,"status");
      if(b.containsKey("lastAccess"))v.lastAccess=str(b,"lastAccess");
    }
    if(create)m.insertVehicle(v);
    else m.updateVehicle(v);
    return v;
  }
}
