package edu.hfut.appointment.client;
import java.util.*;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
@FeignClient(name="user-service",contextId="appointmentAudit",configuration=DirectoryFeignConfig.class,fallbackFactory=AuditFallback.class)
public interface AuditClient {
 @PostMapping("/internal/appointment-audits") Receipt deliver(@RequestHeader("X-Campus-Internal")String key,@RequestBody Map<String,Object> body);
 class Receipt {public boolean accepted;public String eventId;}
}
