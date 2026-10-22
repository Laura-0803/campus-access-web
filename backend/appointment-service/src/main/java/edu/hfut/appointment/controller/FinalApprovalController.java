package edu.hfut.appointment.controller;import java.util.*;import javax.servlet.http.HttpServletRequest;import org.springframework.web.bind.annotation.*;import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;import edu.hfut.appointment.service.impl.FinalApprovalService;import edu.hfut.appointment.dto.Envelope;
@RestController @ConditionalOnProperty(name="p4.internal.enabled",havingValue="true")public class FinalApprovalController{
 private final FinalApprovalService s;public FinalApprovalController(FinalApprovalService s){this.s=s;}
 private String token(HttpServletRequest r){String h=r.getHeader("Authorization");return h!=null&&h.toLowerCase(Locale.ROOT).startsWith("bearer ")?h.substring(7).trim():r.getHeader("x-campus-token");}
 @PostMapping("/internal/final-approvals/{id}")public Object approve(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b){return Envelope.ok(s.approve(token(r),id,b));}
 @GetMapping("/internal/issuance-decision/{id}")public Object decision(@PathVariable String id){return s.decision(id);}
 @GetMapping("/internal/issuance-status/{id}")public Object status(@PathVariable String id){return s.status(id);}
}
