package edu.hfut.appointment.client;import java.util.*;import org.springframework.cloud.openfeign.FeignClient;import org.springframework.web.bind.annotation.*;
@FeignClient(name="access-service",contextId="appointmentIssuance",configuration=DirectoryFeignConfig.class)public interface IssuanceClient{
 @PostMapping("/internal/issuance/prepare")Map<String,Object>prepare(@RequestHeader("X-Campus-Internal")String key,@RequestHeader("Authorization")String token,@RequestBody Map<String,Object>body);
 @PostMapping("/internal/issuance/activate")Map<String,Object>activate(@RequestHeader("X-Campus-Internal")String key,@RequestBody Map<String,Object>body);
 @GetMapping("/internal/issuance/{id}")Map<String,Object>result(@RequestHeader("X-Campus-Internal")String key,@PathVariable("id")String id);
}
