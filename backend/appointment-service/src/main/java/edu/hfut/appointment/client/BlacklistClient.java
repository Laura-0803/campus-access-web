package edu.hfut.appointment.client;
import java.util.*;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
@FeignClient(name="${P4C_EXCEPTION_SERVICE:legacy-bridge}",contextId="appointmentBlacklist",configuration=DirectoryFeignConfig.class,fallbackFactory=BlacklistFallback.class)
public interface BlacklistClient {
 @PostMapping("/internal/blacklist-check") Result check(@RequestHeader("X-Campus-Internal")String key,@RequestBody Map<String,String> body);
 class Result {public boolean available;public Boolean blocked;}
}
