package edu.hfut.campus.lab;

import java.util.*;
import org.springframework.web.bind.annotation.*;
import com.netflix.hystrix.*;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
@RestController @RequestMapping("/lab")
public class CallController {
 private final LabClient client; private final LoadBalancerClient loadBalancer;
 public CallController(LabClient client,LoadBalancerClient loadBalancer){this.client=client;this.loadBalancer=loadBalancer;}
 @GetMapping("/stack") public Map<String,Object> stack(){return Map.of("loadBalancerClass",loadBalancer.getClass().getName(),"feignClientClass",client.getClass().getName());}
 @GetMapping("/call") public Map<String,Object> call(){return client.identity();}
 @GetMapping("/circuit") public List<Map<String,Object>> circuit(){
  List<Map<String,Object>> result=new ArrayList<>();
  for(HystrixCommandMetrics metrics:HystrixCommandMetrics.getInstances()) {
   HystrixCircuitBreaker breaker=HystrixCircuitBreaker.Factory.getInstance(metrics.getCommandKey());
   Map<String,Object> value=new LinkedHashMap<>();
   value.put("observedAtEpochMs",System.currentTimeMillis()); value.put("command",metrics.getCommandKey().name());
   value.put("open",breaker!=null&&breaker.isOpen());
   value.put("requests",metrics.getHealthCounts().getTotalRequests());value.put("errors",metrics.getHealthCounts().getErrorCount());
   for(HystrixEventType type:List.of(HystrixEventType.SUCCESS,HystrixEventType.FAILURE,HystrixEventType.TIMEOUT,HystrixEventType.SHORT_CIRCUITED,HystrixEventType.FALLBACK_SUCCESS)) {
    value.put("total"+type.name(),metrics.getCumulativeCount(type));value.put("rolling"+type.name(),metrics.getRollingCount(type));
   }
   value.put("concurrentExecutions",metrics.getCurrentConcurrentExecutionCount());
   value.put("sleepWindowMs",metrics.getProperties().circuitBreakerSleepWindowInMilliseconds().get());
   // This 1.5.18 implementation has no HALF_OPEN enum. Observe the real probe gate, read-only.
   try {
    java.lang.reflect.Field gate=breaker.getClass().getDeclaredField("circuitOpenedOrLastTestedTime");gate.setAccessible(true);
    value.put("openedOrLastProbeAtEpochMs",((java.util.concurrent.atomic.AtomicLong)gate.get(breaker)).get());
    value.put("state",!breaker.isOpen()?"CLOSED":metrics.getCurrentConcurrentExecutionCount()>0?"OPEN_PROBE_IN_FLIGHT":"OPEN");
    value.put("nativeHalfOpenEnum",false);
   } catch(ReflectiveOperationException exception) {value.put("state","UNAVAILABLE");}
   result.add(value);
  } return result;
 }
}
