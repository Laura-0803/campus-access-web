package edu.hfut.campus.controller;
import java.util.*;import org.springframework.web.bind.annotation.*;import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;import edu.hfut.campus.dao.DomainMapper;import edu.hfut.campus.entity.AuditEntity;import edu.hfut.campus.exception.ApiException;import static edu.hfut.campus.dto.Responses.map;
@RestController @ConditionalOnProperty(name="p3.internal.enabled",havingValue="true")
public class AppointmentAuditController {
 private final DomainMapper dao;public AppointmentAuditController(DomainMapper dao){this.dao=dao;}
 @PostMapping("/internal/appointment-audits")public Object accept(@RequestBody Map<String,String> event){
  String id=event.get("eventId"),action=event.get("action"),target=event.get("appointmentId");
  if(id==null||!id.matches("P3-AUDIT-[0-9a-f-]{36}")||target==null||target.length()>128||!Arrays.asList("CREATE","HOST_APPROVE","HOST_REJECT","SECURITY_REJECT","SECURITY_APPROVE").contains(action))throw new ApiException(400,"审计事件参数不正确");
  AuditEntity a=new AuditEntity();a.id=id;a.time=event.get("occurredAt");a.actor=event.get("actor");a.role=event.get("role");a.action=action;a.target=target;a.result="成功";dao.legacyAudit(a);
  return map("accepted",true,"eventId",id);
 }
}
