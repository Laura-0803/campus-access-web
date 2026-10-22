package edu.hfut.access.client;import java.util.*;import org.springframework.cloud.openfeign.FeignClient;import org.springframework.web.bind.annotation.*;
@FeignClient(name="user-service",contextId="accessEvents",configuration=DirectoryFeignConfig.class)public interface EventClient{
 @PostMapping("/internal/access-events")Object accept(@RequestHeader("X-Campus-Internal")String key,@RequestBody Map<String,Object>body);
}
