package edu.hfut.incidents.client;import java.util.*;import org.springframework.cloud.openfeign.*;import org.springframework.web.bind.annotation.*;import edu.hfut.incidents.dto.Context;
@FeignClient(name="user-service",configuration=DirectoryFeignConfig.class,fallbackFactory=DirectoryFallback.class) public interface DirectoryClient {
 @PostMapping("/internal/access-context")Context resolve(@RequestHeader("X-Campus-Internal")String key,@RequestHeader("Authorization")String token,@RequestBody Map<String,Object> body);
 @GetMapping("/internal/access-people")List<Map<String,Object>> people(@RequestHeader("X-Campus-Internal")String key);
}
