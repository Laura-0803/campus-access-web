package edu.hfut.campus;
import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.*;
import org.springframework.context.annotation.*;
import org.springframework.cloud.gateway.route.*;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.cloud.gateway.filter.*;
import org.springframework.core.Ordered;
@SpringBootApplication public class GatewayApplication  {
  public static void main(String[] a)  {
    SpringApplication.run(GatewayApplication.class,a);
  }
  @Bean RouteLocator routes(RouteLocatorBuilder b)  {
    RouteLocatorBuilder.Builder routes=b.routes();
    if(Boolean.parseBoolean(System.getenv("P6_MODE")))routes.route("aggregation",r->r.path("/api/health","/api/dashboard/**","/api/reports/**").uri("lb://aggregation-service"));
    if(Boolean.parseBoolean(System.getenv("P3_MODE")))routes.route("appointments",r->r.path("/api/appointments","/api/appointments/**").uri("lb://appointment-service"));
    if(Boolean.parseBoolean(System.getenv("P4C_MODE")))routes.route("exceptions",r->r.path("/api/exceptions","/api/exceptions/**","/api/blacklist","/api/blacklist/**").uri("lb://exception-service"));
    if(Boolean.parseBoolean(System.getenv("P4_MODE")))routes.route("access",r->r.path("/api/qr-codes","/api/qr-codes/**","/api/access-records","/api/access-records/**","/api/devices","/api/devices/**","/api/gates","/api/gates/**","/api/access-rules","/api/access-rules/**").uri("lb://access-service"));
    routes.route("users",r->r.path("/api/auth/**","/api/roles","/api/profiles/**","/api/users","/api/users/**","/api/faces","/api/faces/**","/api/vehicles","/api/vehicles/**","/api/messages","/api/messages/**","/api/logs").uri("lb://user-service")).route("people",r->r.path("/api/people","/api/people/**").and().method(org.springframework.http.HttpMethod.GET,org.springframework.http.HttpMethod.POST,org.springframework.http.HttpMethod.PATCH).uri("lb://user-service"));
    if(!Boolean.parseBoolean(System.getenv("P6_MODE")))routes.route("legacy",r->r.path("/api/**").uri("http://127.0.0.1:19830"));
    return routes.build();
  }
  @Bean org.springframework.web.reactive.function.server.RouterFunction<org.springframework.web.reactive.function.server.ServerResponse> p6Ready(){
    return org.springframework.web.reactive.function.server.RouterFunctions.route(org.springframework.web.reactive.function.server.RequestPredicates.GET("/internal/p6-ready"),r->{
      String k=r.headers().firstHeader("X-Campus-Internal"),expected=System.getenv("P2_INTERNAL_KEY");
      if(k==null||expected==null||!java.security.MessageDigest.isEqual(k.getBytes(java.nio.charset.StandardCharsets.UTF_8),expected.getBytes(java.nio.charset.StandardCharsets.UTF_8)))return org.springframework.web.reactive.function.server.ServerResponse.status(403).build();
      return org.springframework.web.reactive.function.server.ServerResponse.ok().contentType(org.springframework.http.MediaType.APPLICATION_JSON).bodyValue(java.util.Collections.singletonMap("ready",true));
    });
  }
  @Bean GlobalFilter stripIdentity()  {
    return new IdentityFilter();
  }
  static class IdentityFilter implements GlobalFilter,Ordered  {
    public int getOrder()  {
      return -100;
    }
    public reactor.core.publisher.Mono<Void> filter(org.springframework.web.server.ServerWebExchange exchange,GatewayFilterChain chain)  {
      return chain.filter(exchange.mutate().request(exchange.getRequest().mutate().headers(h->  {
        for(String n:new java.util.ArrayList<>(h.keySet()))if(n.toLowerCase().startsWith("x-user")||n.toLowerCase().startsWith("x-role")||n.toLowerCase().startsWith("x-campus-internal")||n.equalsIgnoreCase("x-adapter-key"))h.remove(n);h.set("X-Adapter-Key",System.getenv("P2_ADAPTER_KEY"));
      }
      ).build()).build()).onErrorResume(error->{
        if(Boolean.parseBoolean(System.getenv("P4_MODE"))&&exchange.getRequest().getMethod()==org.springframework.http.HttpMethod.PATCH&&exchange.getRequest().getPath().value().matches("/api/appointments/[^/]+/review")&&!exchange.getResponse().isCommitted()){
          exchange.getResponse().setStatusCode(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE);exchange.getResponse().getHeaders().setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
          byte[] body="{\"success\":false,\"error\":{\"message\":\"签发结果尚未确认，请勿重复生成凭证，请联系管理员核实\"}}".getBytes(java.nio.charset.StandardCharsets.UTF_8);
          return exchange.getResponse().writeWith(reactor.core.publisher.Mono.just(exchange.getResponse().bufferFactory().wrap(body)));
        }return reactor.core.publisher.Mono.error(error);
      });
    }
  }
}
