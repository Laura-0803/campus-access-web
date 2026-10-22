package edu.hfut.campus.lab;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletRequest;
import com.netflix.appinfo.InstanceInfo;
import com.netflix.discovery.EurekaClient;
import com.netflix.discovery.CacheRefreshedEvent;
import com.netflix.loadbalancer.*;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.cloud.netflix.ribbon.SpringClientFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** Whitelisted diagnostics for the loopback-only compatibility lab, never a business API. */
@RestController @Profile("lab-diagnostics") @RequestMapping("/lab")
public class DiscoveryDiagnostics {
    private final DiscoveryClient discovery;
    private final EurekaClient eureka;
    private final SpringClientFactory factory;
    private final long attachedAt = System.currentTimeMillis();
    private final AtomicLong cacheRefreshEventAt = new AtomicLong();
    public DiscoveryDiagnostics(DiscoveryClient discovery, EurekaClient eureka,
                                SpringClientFactory factory, Environment environment) {
        if (!"127.0.0.1".equals(environment.getProperty("server.address")))
            throw new IllegalArgumentException("Lab diagnostics require loopback binding");
        this.discovery=discovery; this.eureka=eureka; this.factory=factory;
        eureka.registerEventListener(event -> {
            if (event instanceof CacheRefreshedEvent) cacheRefreshEventAt.set(System.currentTimeMillis());
        });
    }
    private Map<String,Object> instance(InstanceInfo i) {
        Map<String,Object> v=new LinkedHashMap<>();
        v.put("appName",i.getAppName()); v.put("instanceId",i.getInstanceId());
        v.put("hostName",i.getHostName()); v.put("ipAddr",i.getIPAddr());
        v.put("port",i.getPort()); v.put("status",i.getStatus().name());
        v.put("vipAddress",i.getVIPAddress()); v.put("lastRenewalTimestamp",i.getLeaseInfo().getRenewalTimestamp());
        return v;
    }
    private List<Map<String,Object>> servers(List<Server> values) {
        return values.stream().map(s -> {
            Map<String,Object> v=new LinkedHashMap<>();v.put("host",s.getHost());v.put("port",s.getPort());
            v.put("id",s.getId());v.put("alive",s.isAlive());v.put("zone",s.getZone());return v;
        }).collect(Collectors.toList());
    }
    @GetMapping("/discovery") public Map<String,Object> inspect(HttpServletRequest request) {
        if (!Set.of("127.0.0.1","0:0:0:0:0:0:0:1","::1").contains(request.getRemoteAddr()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("observedAtEpochMs",System.currentTimeMillis());result.put("listenerAttachedAtEpochMs",attachedAt);
        result.put("cacheRefreshEventAtEpochMs",cacheRefreshEventAt.get());
        result.put("discoveryClientClass",discovery.getClass().getName());
        result.put("springDiscovery",discovery.getInstances("lab-provider").stream().map(i -> {
            Map<String,Object> v=new LinkedHashMap<>();v.put("instanceId",i.getInstanceId());
            v.put("host",i.getHost());v.put("port",i.getPort());v.put("serviceId",i.getServiceId());return v;
        }).collect(Collectors.toList()));
        result.put("eurekaClientClass",eureka.getClass().getName());
        com.netflix.discovery.shared.Application app=eureka.getApplication("LAB-PROVIDER");
        result.put("eurekaApplication",app==null ? List.of() : app.getInstances().stream().map(this::instance).collect(Collectors.toList()));
        result.put("eurekaVip",eureka.getInstancesByVipAddress("lab-provider",false).stream().map(this::instance).collect(Collectors.toList()));
        if (eureka instanceof com.netflix.discovery.DiscoveryClient) {
            com.netflix.discovery.DiscoveryClient client=(com.netflix.discovery.DiscoveryClient)eureka;
            result.put("registryFetchAgeMs",client.getLastSuccessfulRegistryFetchTimePeriod());
            result.put("registryFetchIntervalSeconds",client.getEurekaClientConfig().getRegistryFetchIntervalSeconds());
        }
        ILoadBalancer lb=factory.getLoadBalancer("lab-provider");
        result.put("loadBalancerClass",lb.getClass().getName());
        result.put("ribbonAllServers",servers(lb.getAllServers()));result.put("ribbonReachableServers",servers(lb.getReachableServers()));
        if (lb instanceof BaseLoadBalancer) result.put("ruleClass",((BaseLoadBalancer)lb).getRule().getClass().getName());
        if (lb instanceof DynamicServerListLoadBalancer) {
            DynamicServerListLoadBalancer<?> dynamic=(DynamicServerListLoadBalancer<?>)lb;
            result.put("serverListClass",dynamic.getServerListImpl().getClass().getName());
            result.put("serverListFilterClass",dynamic.getFilter().getClass().getName());
            // Read the source list without mutating Ribbon's current list or forcing a refresh.
            result.put("serverListSource",servers(new ArrayList<Server>(dynamic.getServerListImpl().getUpdatedListOfServers())));
            result.put("ribbonLastUpdate",dynamic.getLastUpdate());
            result.put("ribbonRefreshAgeMs",dynamic.getDurationSinceLastUpdateMs());
        }
        return result;
    }
}
