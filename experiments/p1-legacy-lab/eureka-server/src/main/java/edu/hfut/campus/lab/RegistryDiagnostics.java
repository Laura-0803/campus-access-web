package edu.hfut.campus.lab;

import java.util.*;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletRequest;
import com.netflix.appinfo.ApplicationInfoManager;
import com.netflix.eureka.EurekaServerContext;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController @Profile("lab-diagnostics")
public class RegistryDiagnostics {
    private final EurekaServerContext context;
    private final ApplicationInfoManager info;
    private final String configuredPeer;
    public RegistryDiagnostics(EurekaServerContext context,ApplicationInfoManager info,Environment env) {
        if(!"127.0.0.1".equals(env.getProperty("server.address"))) throw new IllegalArgumentException("Diagnostics require loopback");
        this.context=context;this.info=info;configuredPeer=env.getProperty("eureka.client.service-url.defaultZone");
    }
    @GetMapping("/lab/registry") public Map<String,Object> inspect(HttpServletRequest request) {
        if(!Set.of("127.0.0.1","::1","0:0:0:0:0:0:0:1").contains(request.getRemoteAddr())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Map<String,Object> value=new LinkedHashMap<>();
        value.put("observedAtEpochMs",System.currentTimeMillis());value.put("instanceId",info.getInfo().getInstanceId());
        value.put("hostName",info.getInfo().getHostName());value.put("configuredPeer",configuredPeer);
        value.put("peerMisclassifiedAsSelf",context.getPeerEurekaNodes().isThisMyUrl(configuredPeer));
        value.put("activePeerUrls",context.getPeerEurekaNodes().getPeerNodesView().stream().map(node -> node.getServiceUrl()).collect(Collectors.toList()));
        com.netflix.discovery.shared.Application app=context.getRegistry().getApplication("LAB-PROVIDER");
        value.put("liveRegistry",app==null?List.of():app.getInstances().stream().map(i -> {
            Map<String,Object> r=new LinkedHashMap<>();r.put("instanceId",i.getInstanceId());r.put("port",i.getPort());
            r.put("status",i.getStatus().name());r.put("lastRenewalTimestamp",i.getLeaseInfo().getRenewalTimestamp());return r;
        }).collect(Collectors.toList()));return value;
    }
}
