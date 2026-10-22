package edu.hfut.aggregate.client;
import java.util.*;import org.springframework.cloud.openfeign.FeignClient;import org.springframework.web.bind.annotation.*;
@FeignClient(name="campus-gateway") public interface GatewayClient{@GetMapping("/internal/p6-ready") Map<String,Object> ready(@RequestHeader("X-Campus-Internal")String key);}