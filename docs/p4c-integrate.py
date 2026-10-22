from pathlib import Path
R=Path(__file__).resolve().parents[1]
for name in ['backend/access-service/src/main/java/edu/hfut/access/client/SafetyClient.java','backend/access-service/src/main/java/edu/hfut/access/client/ExceptionEventClient.java','backend/appointment-service/src/main/java/edu/hfut/appointment/client/BlacklistClient.java']:
 p=R/name;t=p.read_text(encoding='utf-8').replace('name="legacy-bridge"','name="${P4C_EXCEPTION_SERVICE:legacy-bridge}"');p.write_text(t,encoding='utf-8')
for module in ['access-service','appointment-service']:
 p=R/'backend'/module/'src/main/resources/application.properties';t=p.read_text();t+='\nexception-service.ribbon.ServerListRefreshInterval=1000\nexception-service.ribbon.NFLoadBalancerRuleClassName=com.netflix.loadbalancer.RoundRobinRule\n' if 'exception-service.ribbon.ServerListRefreshInterval' not in t else '';p.write_text(t,encoding='utf-8')
p=R/'backend/gateway-service/src/main/java/edu/hfut/campus/GatewayApplication.java';t=p.read_text(encoding='utf-8');marker='    if(Boolean.parseBoolean(System.getenv("P4_MODE")))';addition='    if(Boolean.parseBoolean(System.getenv("P4C_MODE")))routes.route("exceptions",r->r.path("/api/exceptions","/api/exceptions/**","/api/blacklist","/api/blacklist/**").uri("lb://exception-service"));\n';t=t.replace(marker,addition+marker) if 'P4C_MODE' not in t else t;p.write_text(t,encoding='utf-8')
print('P4-C optional routing integrated; P4 defaults preserved')
