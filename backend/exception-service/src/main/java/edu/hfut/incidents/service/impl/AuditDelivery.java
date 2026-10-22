package edu.hfut.incidents.service.impl;import java.util.*;import org.springframework.stereotype.Component;import org.springframework.scheduling.annotation.*;import org.springframework.beans.factory.annotation.Value;import com.fasterxml.jackson.databind.ObjectMapper;import edu.hfut.incidents.dao.IncidentMapper;import edu.hfut.incidents.client.AuditClient;
@Component @EnableScheduling public class AuditDelivery {
 private final IncidentMapper d;private final AuditClient c;private final ObjectMapper j;@Value("${P4_INTERNAL_KEY}")String key;
 public AuditDelivery(IncidentMapper d,AuditClient c,ObjectMapper j){this.d=d;this.c=c;this.j=j;}
 @Scheduled(fixedDelay=500)public void send(){for(Map<String,Object>x:d.due()){String id=String.valueOf(x.get("event_id"));if(d.claim(id)!=1)continue;try{Map<String,Object>ack=c.accept(key,j.readValue(String.valueOf(x.get("payload")),Map.class));if(!Boolean.TRUE.equals(ack.get("accepted"))||!id.equals(ack.get("eventId")))throw new IllegalStateException();d.delivered(id);}catch(Exception e){d.failed(id);}}}
}
