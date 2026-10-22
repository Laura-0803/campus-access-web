"""Generate an isolated synthetic P1 compatibility lab; never touches legacy code."""
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent/'experiments/p1-legacy-lab'
if ROOT.exists():
 raise SystemExit('Initial generator is retired for an existing lab; edit the reviewed experiment sources directly. No files written.')
def put(name,text):
 p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text.strip()+'\n',encoding='utf8')
modules={'eureka-server':['spring-cloud-starter-netflix-eureka-server'], 'provider-service':['spring-boot-starter-web','spring-cloud-starter-netflix-eureka-client','mybatis-spring-boot-starter','mysql-connector-java','spring-boot-starter-test'], 'consumer-service':['spring-boot-starter-web','spring-cloud-starter-netflix-eureka-client','spring-cloud-starter-openfeign','spring-cloud-starter-netflix-ribbon','spring-cloud-starter-netflix-hystrix'], 'gateway-service':['spring-cloud-starter-gateway','spring-cloud-starter-netflix-eureka-client','spring-cloud-starter-netflix-ribbon']}
put('pom.xml','''<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
<modelVersion>4.0.0</modelVersion>
<parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>2.3.12.RELEASE</version><relativePath/></parent>
<groupId>edu.hfut.campus.lab</groupId><artifactId>p1-legacy-lab</artifactId><version>0.1.0-SNAPSHOT</version><packaging>pom</packaging>
<properties><java.version>11</java.version><spring-cloud.version>Hoxton.SR12</spring-cloud.version><mybatis.version>2.1.4</mybatis.version></properties>
<modules>'''+''.join('<module>'+m+'</module>' for m in modules)+'''</modules>
<dependencyManagement><dependencies><dependency><groupId>org.springframework.cloud</groupId><artifactId>spring-cloud-dependencies</artifactId><version>${spring-cloud.version}</version><type>pom</type><scope>import</scope></dependency></dependencies></dependencyManagement>
<build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build>
</project>''')
for module,deps in modules.items():
 dependencies=[]
 for dep in deps:
  group='org.springframework.cloud' if dep.startswith('spring-cloud') else 'org.mybatis.spring.boot' if dep.startswith('mybatis') else 'mysql' if dep=='mysql-connector-java' else 'org.springframework.boot'
  version='<version>${mybatis.version}</version>' if dep.startswith('mybatis') else ''
  scope='<scope>test</scope>' if dep.endswith('-test') else '<scope>runtime</scope>' if dep=='mysql-connector-java' else ''
  exclusion='<exclusions><exclusion><groupId>org.junit.vintage</groupId><artifactId>junit-vintage-engine</artifactId></exclusion></exclusions>' if dep.endswith('-test') else ''
  dependencies.append(f'<dependency><groupId>{group}</groupId><artifactId>{dep}</artifactId>{version}{scope}{exclusion}</dependency>')
 put(module+'/pom.xml','''<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><parent><groupId>edu.hfut.campus.lab</groupId><artifactId>p1-legacy-lab</artifactId><version>0.1.0-SNAPSHOT</version></parent><artifactId>'''+module+'</artifactId><dependencies>'+''.join(dependencies)+'</dependencies></project>')
common='''
server.address=127.0.0.1
eureka.client.service-url.defaultZone=http://localhost:18761/eureka/,http://127.0.0.1:18762/eureka/
eureka.client.registry-fetch-interval-seconds=3
eureka.client.initial-instance-info-replication-interval-seconds=1
eureka.instance.prefer-ip-address=true
eureka.instance.ip-address=127.0.0.1
eureka.instance.instance-id=${spring.application.name}:${server.port}
eureka.instance.lease-renewal-interval-in-seconds=3
eureka.instance.lease-expiration-duration-in-seconds=9
logging.level.com.netflix.discovery=warn
logging.level.com.netflix.eureka=warn
'''
for module in modules:
 port={'eureka-server':18761,'provider-service':18811,'consumer-service':18821,'gateway-service':18800}[module]
 name={'eureka-server':'lab-registry','provider-service':'lab-provider','consumer-service':'lab-consumer','gateway-service':'lab-gateway'}[module]
 extra=''
 if module=='eureka-server': extra='''
eureka.server.enable-self-preservation=false
eureka.server.eviction-interval-timer-in-ms=3000
eureka.server.response-cache-update-interval-ms=1000
eureka.instance.hostname=${REGISTRY_HOST:localhost}
eureka.client.service-url.defaultZone=${PEER_URL:http://127.0.0.1:18762/eureka/}
'''
 if module=='provider-service': extra='''
spring.datasource.url=${LAB_DB_URL}
spring.datasource.username=${LAB_DB_USER}
spring.datasource.password=${LAB_DB_PASSWORD}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.hikari.maximum-pool-size=3
spring.datasource.initialization-mode=never
mybatis.mapper-locations=classpath:mapper/*.xml
mybatis.configuration.map-underscore-to-camel-case=true
'''
 if module=='consumer-service': extra='''
feign.hystrix.enabled=true
feign.client.config.default.connectTimeout=500
feign.client.config.default.readTimeout=1000
lab-provider.ribbon.ServerListRefreshInterval=2000
lab-provider.ribbon.ConnectTimeout=500
lab-provider.ribbon.ReadTimeout=1000
lab-provider.ribbon.MaxAutoRetries=0
lab-provider.ribbon.MaxAutoRetriesNextServer=0
hystrix.command.default.execution.isolation.thread.timeoutInMilliseconds=1500
hystrix.command.default.circuitBreaker.requestVolumeThreshold=3
hystrix.command.default.circuitBreaker.errorThresholdPercentage=50
hystrix.command.default.circuitBreaker.sleepWindowInMilliseconds=3000
hystrix.command.default.metrics.rollingStats.timeInMilliseconds=10000
'''
 if module=='gateway-service': extra='''
spring.cloud.gateway.routes[0].id=lab-consumer
spring.cloud.gateway.routes[0].uri=lb://lab-consumer
spring.cloud.gateway.routes[0].predicates[0]=Path=/api/lab/call,/api/lab/circuit
spring.cloud.gateway.routes[0].filters[0]=StripPrefix=1
spring.cloud.gateway.routes[1].id=lab-provider
spring.cloud.gateway.routes[1].uri=lb://lab-provider
spring.cloud.gateway.routes[1].predicates[0]=Path=/api/lab/identity,/api/lab/items/**,/api/lab/items
spring.cloud.gateway.routes[1].filters[0]=StripPrefix=1
'''
 put(module+'/src/main/resources/application.properties',f'spring.application.name={name}\nserver.port={port}\n'+common+extra)
package='package edu.hfut.campus.lab;\n'
def java(module,name,body,test=False): put(module+'/src/'+('test' if test else 'main')+'/java/edu/hfut/campus/lab/'+name+'.java',package+body)
java('eureka-server','RegistryApplication','''
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;
@SpringBootApplication @EnableEurekaServer
public class RegistryApplication { public static void main(String[] args) { SpringApplication.run(RegistryApplication.class,args); } }
''')
java('provider-service','ProviderApplication','''
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@SpringBootApplication
public class ProviderApplication { public static void main(String[] args) { SpringApplication.run(ProviderApplication.class,args); } }
''')
java('provider-service','DatabaseBoundary','''
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
@Component
public class DatabaseBoundary {
 public DatabaseBoundary(@Value("${spring.datasource.url}") String url,@Value("${spring.datasource.username}") String user) {
  if (!url.matches("jdbc:mysql://(?:127[.]0[.]0[.]1|localhost):[0-9]+/campus_p1_lab_[0-9]{14}(?:[?].*)?") || !user.startsWith("p1_lab_"))
   throw new IllegalArgumentException("P1 provider requires an isolated loopback lab schema and restricted lab account");
 }
}
''')
java('provider-service','LabItem','''
public class LabItem {
 private Long id; private String label;
 public Long getId(){return id;} public void setId(Long id){this.id=id;}
 public String getLabel(){return label;} public void setLabel(String label){this.label=label;}
}
''')
java('provider-service','LabItemDao','''
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface LabItemDao {
 int insert(LabItem item); LabItem find(long id); List<LabItem> list(); int update(LabItem item); int delete(long id);
}
''')
put('provider-service/src/main/resources/mapper/LabItemMapper.xml','''
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "https://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="edu.hfut.campus.lab.LabItemDao">
 <resultMap id="item" type="edu.hfut.campus.lab.LabItem"><id property="id" column="id"/><result property="label" column="label"/></resultMap>
 <insert id="insert" useGeneratedKeys="true" keyProperty="id">INSERT INTO lab_items(label) VALUES(#{label})</insert>
 <select id="find" resultMap="item">SELECT id,label FROM lab_items WHERE id=#{id}</select>
 <select id="list" resultMap="item">SELECT id,label FROM lab_items ORDER BY id</select>
 <update id="update">UPDATE lab_items SET label=#{label} WHERE id=#{id}</update>
 <delete id="delete">DELETE FROM lab_items WHERE id=#{id}</delete>
</mapper>
''')
java('provider-service','LabItemService','''
import java.util.List;
public interface LabItemService { LabItem create(String label); LabItem find(long id); List<LabItem> list(); LabItem update(long id,String label); void delete(long id); }
''')
java('provider-service','LabItemServiceImpl','''
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@Service
public class LabItemServiceImpl implements LabItemService {
 private final LabItemDao dao; public LabItemServiceImpl(LabItemDao dao){this.dao=dao;}
 private void validate(String label){if(label==null||label.trim().isEmpty()||label.length()>100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"label must contain 1-100 characters");}
 @Transactional public LabItem create(String label){validate(label);LabItem item=new LabItem();item.setLabel(label);dao.insert(item);return item;}
 public LabItem find(long id){LabItem item=dao.find(id);if(item==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Synthetic lab item not found");return item;}
 public List<LabItem> list(){return dao.list();}
 @Transactional public LabItem update(long id,String label){validate(label);LabItem item=new LabItem();item.setId(id);item.setLabel(label);if(dao.update(item)!=1)throw new ResponseStatusException(HttpStatus.NOT_FOUND);return item;}
 @Transactional public void delete(long id){if(dao.delete(id)!=1)throw new ResponseStatusException(HttpStatus.NOT_FOUND);}
}
''')
java('provider-service','LabController','''
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/lab")
public class LabController {
 private final LabItemService service; private final String port;
 public LabController(LabItemService service,@Value("${server.port}") String port){this.service=service;this.port=port;}
 @GetMapping("/identity") public Map<String,Object> identity(){return Map.of("service","lab-provider","instance",port,"fallback",false);}
 @GetMapping("/items") public List<LabItem> list(){return service.list();}
 @GetMapping("/items/{id}") public LabItem find(@PathVariable long id){return service.find(id);}
 @PostMapping("/items") @ResponseStatus(HttpStatus.CREATED) public LabItem create(@RequestBody LabItem item){return service.create(item.getLabel());}
 @PatchMapping("/items/{id}") public LabItem update(@PathVariable long id,@RequestBody LabItem item){return service.update(id,item.getLabel());}
 @DeleteMapping("/items/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable long id){service.delete(id);}
}
''')
java('provider-service','MyBatisCrudTest','''
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
@SpringBootTest(properties={"eureka.client.enabled=false","spring.cloud.discovery.enabled=false"})
class MyBatisCrudTest {
 @Autowired LabItemService service;
 @Test @Transactional void realMysqlParameterizedCrudAndMissingRow() {
  String payload="synthetic quote ' ; SELECT --";
  LabItem created=service.create(payload); assertNotNull(created.getId());
  assertEquals(payload,service.find(created.getId()).getLabel());
  service.update(created.getId(),"updated synthetic item");
  assertEquals("updated synthetic item",service.find(created.getId()).getLabel());
  service.delete(created.getId());assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.find(created.getId()));
 }
 @Test void productionDatabaseBoundaryRejected(){assertThrows(IllegalArgumentException.class,()->new DatabaseBoundary("jdbc:mysql://127.0.0.1:3306/campus_access","root"));}
}
''',True)
java('consumer-service','ConsumerApplication','''
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.cloud.client.circuitbreaker.EnableCircuitBreaker;
@SpringBootApplication @EnableFeignClients @EnableCircuitBreaker
public class ConsumerApplication { public static void main(String[] args) { SpringApplication.run(ConsumerApplication.class,args); } }
''')
java('consumer-service','LabClient','''
import java.util.Map;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
@FeignClient(name="lab-provider",fallbackFactory=LabFallbackFactory.class)
public interface LabClient { @GetMapping("/lab/identity") Map<String,Object> identity(); }
''')
java('consumer-service','LabFallbackFactory','''
import java.util.Map;
import feign.hystrix.FallbackFactory;
import org.springframework.stereotype.Component;
@Component
public class LabFallbackFactory implements FallbackFactory<LabClient> {
 public LabClient create(Throwable cause){return ()->Map.of("service","lab-provider","fallback",true,"reason",cause.getClass().getSimpleName());}
}
''')
java('consumer-service','CallController','''
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
   result.add(Map.of("command",metrics.getCommandKey().name(),"open",breaker!=null&&breaker.isOpen(),"requests",metrics.getHealthCounts().getTotalRequests(),"errors",metrics.getHealthCounts().getErrorCount()));
  } return result;
 }
}
''')
java('gateway-service','GatewayApplication','''
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@SpringBootApplication
public class GatewayApplication { public static void main(String[] args) { SpringApplication.run(GatewayApplication.class,args); } }
''')
put('README.md','''# P1 LEGACY_STRICT isolated compatibility laboratory

Synthetic endpoints only. No legacy routes, identities or production data are migrated.

Candidate: JDK11, Boot2.3.12.RELEASE, CloudHoxton.SR12, MyBatis starter2.1.4; actual acceptance is recorded in docs/p1-acceptance.md at workspace root.

Modules: eureka-server (two processes 18761/18762), provider-service (18811/18812), consumer-service (18821), gateway-service (18800).

Provider requires LAB_DB_URL / LAB_DB_USER / LAB_DB_PASSWORD for the generated campus_p1_lab_* schema and restricted p1_lab_* account. It rejects production schema addresses. No default production credentials. Eureka peer addresses/low leases and Hystrix thresholds are isolated-lab settings, not production recommendations.

Build using docs/p1-maven.ps1; live verification/start-stop uses docs/p1-run-lab.py. Never execute old Node seed or init scripts. P1 ends before business migration.
''')
print('Generated four-module isolated lab:',ROOT)
