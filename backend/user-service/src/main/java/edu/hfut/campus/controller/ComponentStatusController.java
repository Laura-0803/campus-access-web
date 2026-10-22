package edu.hfut.campus.controller;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.cloud.netflix.ribbon.SpringClientFactory;
import com.netflix.loadbalancer.*;
import com.netflix.hystrix.*;
import static edu.hfut.campus.dto.Responses.*;
/** Local, service-credential-protected evidence. No credentials, identities or payloads. */ @RestController public class ComponentStatusController  {
  private final LoadBalancerClient client;
  private final SpringClientFactory factory;
  public ComponentStatusController(LoadBalancerClient c,SpringClientFactory f)  {
    client=c;
    factory=f;
  }
  @GetMapping("/internal/components")public Object components()  {
    ILoadBalancer lb=factory.getLoadBalancer("legacy-bridge");
    List<Object>circuits=new ArrayList<>();
    for(HystrixCommandMetrics m:HystrixCommandMetrics.getInstances())  {
      HystrixCircuitBreaker cb=HystrixCircuitBreaker.Factory.getInstance(m.getCommandKey());
      circuits.add(map("command",m.getCommandKey().name(),"open",cb!=null&&cb.isOpen(),"requests",m.getHealthCounts().getTotalRequests(),"errors",m.getHealthCounts().getErrorCount(),"failures",m.getCumulativeCount(HystrixEventType.FAILURE),"shortCircuits",m.getCumulativeCount(HystrixEventType.SHORT_CIRCUITED)));
    }
    return map("loadBalancerClient",client.getClass().getName(),"loadBalancer",lb.getClass().getName(),"rule",factory.getInstance("legacy-bridge",IRule.class).getClass().getName(),"servers",lb.getAllServers().toString(),"circuits",circuits);
  }
}
