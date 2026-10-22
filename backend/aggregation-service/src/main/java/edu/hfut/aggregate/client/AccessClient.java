package edu.hfut.aggregate.client;
import java.util.*;import org.springframework.cloud.openfeign.FeignClient;import org.springframework.web.bind.annotation.*;
@FeignClient(name="access-service") public interface AccessClient{@GetMapping("/internal/projection") Map<String,Object> projection(@RequestHeader("X-Campus-Internal")String key);}