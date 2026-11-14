package edu.hfut.access.client;import java.util.*;import org.springframework.cloud.openfeign.FeignClient;import org.springframework.web.bind.annotation.*;
@FeignClient(name="${EXCEPTION_SERVICE_NAME:legacy-bridge}",contextId="accessExceptionEvents",configuration=DirectoryFeignConfig.class)public interface ExceptionEventClient{
 @PostMapping("/internal/access-result")Map<String,Object> accept(@RequestHeader("X-Campus-Internal")String key,@RequestBody Map<String,Object>body);
}
