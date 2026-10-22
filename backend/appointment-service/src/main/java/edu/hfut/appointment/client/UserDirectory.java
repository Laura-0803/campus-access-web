package edu.hfut.appointment.client;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import edu.hfut.appointment.dto.DirectoryContext;
@FeignClient(name="user-service",fallbackFactory=UserDirectoryFallback.class,configuration=DirectoryFeignConfig.class)
public interface UserDirectory {
 @GetMapping("/internal/appointment-context") DirectoryContext context(@RequestHeader("X-Campus-Internal")String key,@RequestHeader("Authorization")String token,@RequestParam("visitorId")String visitorId);
 @PostMapping("/internal/appointment-resolve") edu.hfut.appointment.dto.WriteContext resolve(@RequestHeader("X-Campus-Internal")String key,@RequestHeader("Authorization")String token,@RequestBody java.util.Map<String,Object> body);
}
