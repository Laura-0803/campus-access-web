package edu.hfut.access.client;import java.util.*;import org.springframework.cloud.openfeign.*;import org.springframework.web.bind.annotation.*;
@FeignClient(name="appointment-service",contextId="accessAppointments",configuration=DirectoryFeignConfig.class,fallbackFactory=AppointmentFallback.class)public interface AppointmentClient{
 @GetMapping("/internal/access-appointment/{id}")Map<String,Object> one(@RequestHeader("X-Campus-Internal")String key,@PathVariable("id")String id);
 @GetMapping("/internal/issuance-decision/{id}")Map<String,Object> decision(@RequestHeader("X-Campus-Internal")String key,@PathVariable("id")String id);
}
