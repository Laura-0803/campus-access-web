package edu.hfut.aggregate.client;
import java.util.*;import org.springframework.cloud.openfeign.FeignClient;import org.springframework.web.bind.annotation.*;
@FeignClient(name="appointment-service") public interface AppointmentClient{@GetMapping("/internal/appointments") List<Map<String,Object>> projection(@RequestHeader("X-Campus-Internal")String key);}