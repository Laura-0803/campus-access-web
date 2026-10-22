package edu.hfut.access.service.impl;
import java.util.*;import org.springframework.stereotype.Component;import org.springframework.scheduling.annotation.*;import org.springframework.beans.factory.annotation.Value;import com.fasterxml.jackson.databind.ObjectMapper;import edu.hfut.access.dao.EventMapper;import edu.hfut.access.client.*;import static edu.hfut.access.security.Identity.text;
@Component @EnableScheduling public class EventDelivery{
 private final EventMapper dao;private final EventClient users;private final ExceptionEventClient exceptions;private final ObjectMapper json;@Value("${P4_INTERNAL_KEY}")String key;
 public EventDelivery(EventMapper d,EventClient u,ExceptionEventClient e,ObjectMapper j){dao=d;users=u;exceptions=e;json=j;}
 private Map<String,Object>map(Object...p){Map<String,Object>r=new LinkedHashMap<>();for(int i=0;i<p.length;i+=2)r.put(String.valueOf(p[i]),p[i+1]);return r;}
 @Scheduled(fixedDelay=500)public void deliver(){for(Map<String,Object>row:dao.due()){String id=String.valueOf(row.get("event_id"));if(dao.claim(id)!=1)continue;try{
  Map<String,Object>event=json.readValue(String.valueOf(row.get("payload")),Map.class),record=(Map<String,Object>)event.get("record"),actor=(Map<String,Object>)event.get("actor"),vehicle=(Map<String,Object>)event.get("vehicle");Map<String,Object>ack=exceptions.accept(key,event);if(!Boolean.TRUE.equals(ack.get("accepted"))||!Objects.equals(record.get("id"),ack.get("recordId")))throw new IllegalStateException();
  List<Object>vehicles=vehicle==null?Collections.emptyList():Collections.singletonList(map("id",vehicle.get("id"),"ownerId",vehicle.get("ownerId"),"lastAccess",record.get("time")));Object receipt=users.accept(key,map("audits",Collections.singletonList(map("id","L"+record.get("id"),"time",record.get("time"),"actor",actor.get("name"),"role",actor.get("role"),"action","模拟设备核验","target",text(record,"method")+"/record:"+record.get("id"),"result",Boolean.TRUE.equals(event.get("allowed"))?"成功":"失败")),"vehicles",vehicles));if(receipt==null)throw new IllegalStateException();dao.delivered(id);
 }catch(Exception e){dao.failed(id);}}}
}
