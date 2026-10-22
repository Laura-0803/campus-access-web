package edu.hfut.access.controller;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.cloud.netflix.ribbon.SpringClientFactory;
import com.netflix.loadbalancer.*;
import com.netflix.hystrix.*;
import edu.hfut.access.dao.AccessMapper;
import edu.hfut.access.service.impl.AccessOperationsImpl;
@RestController @RequestMapping("/internal") public class InternalController {
 private final AccessMapper dao;private final SpringClientFactory factory;private final LoadBalancerClient client;private final DiscoveryClient discovery;private final AccessOperationsImpl queries;
 public InternalController(AccessMapper d,SpringClientFactory f,LoadBalancerClient c,DiscoveryClient discovery,AccessOperationsImpl queries){dao=d;factory=f;client=c;this.discovery=discovery;this.queries=queries;}
 @GetMapping("/projection")public Object projection(){Map<String,Object>r=new LinkedHashMap<>();String[][]tables={{"accessRecords","access_records"},{"qrCodes","qr_codes"},{"devices","devices"},{"gates","gates"},{"accessRules","access_rules"}};for(String[]t:tables)r.put(t[0],dao.list(t[1]));List<Map<String,Object>>settings=dao.list("settings");r.put("settings",settings.isEmpty()?Collections.emptyMap():settings.get(0));return r;}
 @GetMapping("/components")public Object components(){
  Map<String,Object> out=new LinkedHashMap<>();ILoadBalancer lb=factory.getLoadBalancer("user-service");
  out.put("loadBalancerClient",client.getClass().getName());out.put("loadBalancer",lb.getClass().getName());out.put("rule",factory.getInstance("user-service",IRule.class).getClass().getName());out.put("servers",lb.getAllServers().toString());
  List<Integer> discovered=new ArrayList<>();discovery.getInstances("user-service").forEach(s->discovered.add(s.getPort()));out.put("discoveryPorts",discovered);out.put("handledBy",queries.instanceCounts());
  List<Object>circuits=new ArrayList<>();for(HystrixCommandMetrics m:HystrixCommandMetrics.getInstances()){
   HystrixCircuitBreaker cb=HystrixCircuitBreaker.Factory.getInstance(m.getCommandKey());Map<String,Object> c=new LinkedHashMap<>();c.put("command",m.getCommandKey().name());c.put("open",cb!=null&&cb.isOpen());c.put("requests",m.getHealthCounts().getTotalRequests());c.put("errors",m.getHealthCounts().getErrorCount());c.put("timeouts",m.getCumulativeCount(HystrixEventType.TIMEOUT));c.put("failures",m.getCumulativeCount(HystrixEventType.FAILURE));c.put("shortCircuits",m.getCumulativeCount(HystrixEventType.SHORT_CIRCUITED));c.put("fallbackResponses",m.getCumulativeCount(HystrixEventType.FALLBACK_SUCCESS));c.put("successes",m.getCumulativeCount(HystrixEventType.SUCCESS));circuits.add(c);
  }out.put("circuits",circuits);Map<String,Object>downstreams=new LinkedHashMap<>();for(String name:Arrays.asList("user-service","legacy-bridge","appointment-service"))downstreams.put(name,factory.getLoadBalancer(name).getAllServers().toString());out.put("downstreams",downstreams);return out;
 }
}
