"""Create only new P6 module boilerplate; never reads private configuration."""
from pathlib import Path
root=Path('backend/aggregation-service'); java=root/'src/main/java/edu/hfut/aggregate'
def write(p,s):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8')
deps=['org.springframework.boot:spring-boot-starter-web','org.springframework.cloud:spring-cloud-starter-netflix-eureka-client','org.springframework.cloud:spring-cloud-starter-netflix-ribbon','org.springframework.cloud:spring-cloud-starter-openfeign','org.springframework.cloud:spring-cloud-starter-netflix-hystrix']
write(root/'pom.xml','<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><parent><groupId>edu.hfut.campus</groupId><artifactId>campus-services</artifactId><version>0.2.0-SNAPSHOT</version></parent><artifactId>aggregation-service</artifactId><dependencies>'+''.join('<dependency><groupId>'+d.split(':')[0]+'</groupId><artifactId>'+d.split(':')[1]+'</artifactId></dependency>' for d in deps)+'</dependencies></project>')
write(java/'Application.java','package edu.hfut.aggregate;\nimport org.springframework.boot.*;import org.springframework.boot.autoconfigure.*;import org.springframework.cloud.openfeign.EnableFeignClients;import org.springframework.cloud.netflix.hystrix.EnableHystrix;\n@SpringBootApplication @EnableFeignClients @EnableHystrix public class Application{public static void main(String[]a){SpringApplication.run(Application.class,a);}}')
for cls,name,methods in [
 ('UserClient','user-service','@GetMapping("/internal/context") Map<String,Object> context(@RequestHeader("X-Campus-Internal")String key,@RequestHeader("Authorization")String token); @GetMapping("/internal/projection") Map<String,Object> projection(@RequestHeader("X-Campus-Internal")String key);'),
 ('AppointmentClient','appointment-service','@GetMapping("/internal/appointments") List<Map<String,Object>> projection(@RequestHeader("X-Campus-Internal")String key);'),
 ('AccessClient','access-service','@GetMapping("/internal/projection") Map<String,Object> projection(@RequestHeader("X-Campus-Internal")String key);'),
 ('ExceptionClient','exception-service','@GetMapping("/internal/projection") Map<String,Object> projection(@RequestHeader("X-Campus-Internal")String key);'),
 ('GatewayClient','campus-gateway','@GetMapping("/internal/p6-ready") Map<String,Object> ready(@RequestHeader("X-Campus-Internal")String key);')]:
 write(java/'client'/f'{cls}.java',f'package edu.hfut.aggregate.client;\nimport java.util.*;import org.springframework.cloud.openfeign.FeignClient;import org.springframework.web.bind.annotation.*;\n@FeignClient(name="{name}") public interface {cls}{{{methods}}}')
props='''server.address=127.0.0.1
server.port=19861
spring.application.name=aggregation-service
eureka.client.service-url.defaultZone=http://localhost:19761/eureka/,http://127.0.0.1:19762/eureka/
eureka.client.registry-fetch-interval-seconds=3
eureka.client.initial-instance-info-replication-interval-seconds=1
eureka.instance.prefer-ip-address=true
eureka.instance.ip-address=127.0.0.1
eureka.instance.instance-id=${spring.application.name}:${server.port}
eureka.instance.lease-renewal-interval-in-seconds=10
eureka.instance.lease-expiration-duration-in-seconds=90
feign.hystrix.enabled=true
feign.client.config.default.connectTimeout=500
feign.client.config.default.readTimeout=1600
hystrix.command.default.execution.isolation.thread.timeoutInMilliseconds=2300
hystrix.command.default.circuitBreaker.requestVolumeThreshold=4
hystrix.command.default.circuitBreaker.errorThresholdPercentage=50
hystrix.command.default.circuitBreaker.sleepWindowInMilliseconds=3000
hystrix.threadpool.default.coreSize=12
server.error.include-message=never
spring.jackson.default-property-inclusion=always
logging.level.com.netflix.discovery=WARN
logging.level.com.netflix.eureka=WARN
'''
for name in ['user-service','appointment-service','access-service','exception-service','campus-gateway']:
 props+=f'{name}.ribbon.ServerListRefreshInterval=1000\n{name}.ribbon.NFLoadBalancerRuleClassName=com.netflix.loadbalancer.RoundRobinRule\n'
write(root/'src/main/resources/application.properties',props)
