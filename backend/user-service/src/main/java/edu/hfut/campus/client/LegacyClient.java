package edu.hfut.campus.client;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@FeignClient(name="exception-service") public interface LegacyClient  {
  @PostMapping("/internal/blacklist-check") Map<String,Object> blacklist(@RequestHeader("X-Campus-Internal")String key,@RequestBody Map<String,Object> body);
}
