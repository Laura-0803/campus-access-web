package edu.hfut.access.client;import java.util.*;import org.springframework.cloud.openfeign.*;import org.springframework.web.bind.annotation.*;
@FeignClient(name="${P4C_EXCEPTION_SERVICE:legacy-bridge}",contextId="accessSafety",configuration=DirectoryFeignConfig.class,fallbackFactory=SafetyFallback.class)public interface SafetyClient{
 @PostMapping("/internal/access-blacklist")Map<String,Object> check(@RequestHeader("X-Campus-Internal")String key,@RequestBody Map<String,Object> body);
}
