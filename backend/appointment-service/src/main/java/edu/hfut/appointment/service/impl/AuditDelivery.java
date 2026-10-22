package edu.hfut.appointment.service.impl;
import java.util.*;import org.springframework.stereotype.Component;import org.springframework.scheduling.annotation.*;import org.springframework.beans.factory.annotation.Value;import com.fasterxml.jackson.databind.ObjectMapper;import edu.hfut.appointment.dao.OutboxMapper;import edu.hfut.appointment.client.AuditClient;
@Component @EnableScheduling public class AuditDelivery {
 private final OutboxMapper dao;private final AuditClient client;private final ObjectMapper json;
 @Value("${P3_INTERNAL_KEY}")String key;
 public AuditDelivery(OutboxMapper dao,AuditClient client,ObjectMapper json){this.dao=dao;this.client=client;this.json=json;}
 @Scheduled(fixedDelay=500)public void deliver(){for(Map<String,Object> row:dao.due()){
  String id=String.valueOf(row.get("event_id"));if(dao.claim(id)!=1)continue;
  try{AuditClient.Receipt receipt=client.deliver(key,json.readValue(String.valueOf(row.get("payload")),Map.class));if(receipt!=null&&receipt.accepted&&id.equals(receipt.eventId))dao.delivered(id);else dao.failed(id);}catch(Exception e){dao.failed(id);}
 }}
}
