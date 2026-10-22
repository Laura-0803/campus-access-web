package edu.hfut.campus.service.impl;
import java.util.*;
import java.time.*;
import java.time.format.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import edu.hfut.campus.dao.DomainMapper;
import edu.hfut.campus.entity.*;
import edu.hfut.campus.service.MessageService;
import edu.hfut.campus.exception.ApiException;
import static edu.hfut.campus.dto.Responses.*;
@Service public class MessageServiceImpl implements MessageService  {
  private final DomainMapper d;
  private final ObjectMapper json;
  public MessageServiceImpl(DomainMapper d,ObjectMapper j)  {
    this.d=d;
    json=j;
  }
  private List<String>targets(Object value)  {
    Collection<?> raw;
    if(value instanceof Collection)raw=(Collection<?>)value;
    else  {
      String s=value==null?"":value.toString().trim();
      try  {
        Object p=json.readValue(s,Object.class);
        raw=p instanceof Collection?(Collection<?>)p:Collections.singleton(s);
      }
      catch(Exception e)  {
        raw=Arrays.asList(s.split("[、,，/]"));
      }
    }
    Set<String>out=new LinkedHashSet<>();
    for(Object item:raw)  {
      String s=item==null?"":item.toString().trim();
      if(Arrays.asList("all","student","teacher","visitor","alumni","guard","admin").contains(s))out.add(s);
    }
    if(out.contains("all"))return Collections.singletonList("all");
    return new ArrayList<>(out);
  }
  private boolean canRead(UserEntity u,Map<String,String>q,MessageEntity m)  {
    List<String>t=targets(m.targetRole);
    String role="admin".equals(u.role)?q.get("role"):u.role;
    return role==null||role.isEmpty()||t.contains("all")||t.contains(role);
  }
  private Object view(MessageEntity m)  {
    return map("id",m.id,"title",m.title,"content",m.content,"targetRole",m.targetRole,"read",m.read,"createdAt",m.createdAt,"targetRoles",targets(m.targetRole));
  }
  public Object list(UserEntity u,Map<String,String>q)  {
    List<Object>out=new ArrayList<>();
    for(MessageEntity m:d.messages())  {
      String title=m.title==null?"":m.title.trim(),content=m.content==null?"":m.content.trim();
      if(title.matches("^预约(已通过|未通过|待保卫处审核|待被访人审核|待审核).*")||title.matches("^访客预约待(保卫处审核|被访人审核|审核)$")||content.matches("^.+ 提交了新的来访预约.*")||content.matches("^.+ 的预约已(通过|未通过|由保卫处|由.+通过|被.+驳回).*"))continue;
      if(canRead(u,q,m)&&(!q.containsKey("read")||String.valueOf(m.read).equals(q.get("read"))))out.add(view(m));
    }
    return map("success",true,"data",out,"total",out.size());
  }
  @Transactional public Object write(UserEntity u,String id,Map<String,String>q,Map<String,Object>b,String action)  {
    if(!"read".equals(action))ProfileServiceImpl.admin(u);
    MessageEntity m=id==null?new MessageEntity():d.message(id);
    if(m==null)throw new ApiException(404,"read".equals(action)?"通知不存在":"公告不存在");
    if("delete".equals(action))  {
      d.deleteMessage(id);
      return m;
    }
    if("read".equals(action))  {
      if(!canRead(u,q,m))throw new ApiException(403,"无权操作该通知");
      m.read=b.get("read")==null?true:Boolean.valueOf(str(b,"read"));
      d.updateMessage(m);
      return m;
    }
    boolean create=id==null;
    if(create)  {
      m.id="M"+UUID.randomUUID();
      m.read=false;
      m.createdAt=LocalDateTime.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
    if(create||b.containsKey("title"))m.title=str(b,"title").trim();
    if(create||b.containsKey("content"))m.content=str(b,"content").trim();
    if(m.title==null||m.title.isEmpty()||m.content==null||m.content.isEmpty())throw new ApiException(400,create?"请填写公告标题和公告内容":"公告标题和公告内容不能为空");
    if(create||b.containsKey("targetRoles")||b.containsKey("targetRole"))  {
      Object value=b.getOrDefault("targetRoles",b.getOrDefault("targetRole","all"));
      List<String>t=targets(value);
      if(t.isEmpty())throw new ApiException(400,"请至少选择一个接收对象");
      m.targetRole=String.join(",",t);
    }
    if(create)d.insertMessage(m);
    else d.updateMessage(m);
    return view(m);
  }
  public Object logs(UserEntity u,Map<String,String>q)  {
    ProfileServiceImpl.admin(u);
    List<AuditEntity>out=new ArrayList<>();
    for(AuditEntity a:d.logs())if((!q.containsKey("role")||q.get("role").isEmpty()||q.get("role").equals(a.role))&&(!q.containsKey("actor")||a.actor!=null&&a.actor.contains(q.get("actor"))))out.add(a);
    return map("success",true,"data",out,"total",out.size());
  }
}
