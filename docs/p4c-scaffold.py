from pathlib import Path
R=Path(__file__).resolve().parents[1];M=R/'backend/exception-service';J=M/'src/main/java/edu/hfut/incidents';S=M/'src/main/resources'
if (M/'pom.xml').exists():raise SystemExit('Scaffold already created; refusing to overwrite reviewed implementation')
for f in ['controller','service','service/impl','dao','entity','dto','client','security','config','exception']:(J/f).mkdir(parents=True,exist_ok=True)
(S/'mapper').mkdir(parents=True,exist_ok=True);(S/'db/migration').mkdir(parents=True,exist_ok=True)
(M/'pom.xml').write_text((R/'backend/access-service/pom.xml').read_text().replace('<artifactId>access-service</artifactId>','<artifactId>exception-service</artifactId>'),encoding='utf-8')
for source in ['exception/ApiException.java','exception/ApiAdvice.java','dto/Envelope.java','dto/Context.java','security/Identity.java','client/DirectoryFeignConfig.java','client/DirectoryFallback.java','client/DirectoryClient.java','config/LocalBoundary.java']:
 text=(R/'backend/access-service/src/main/java/edu/hfut/access'/source).read_text(encoding='utf-8').replace('edu.hfut.access','edu.hfut.incidents').replace('campus_p4_access_','campus_p4c_exception_').replace('X-P4-Service','X-P4C-Service').replace('"access-service"','"exception-service"').replace('${P4_INTERNAL_KEY}','${P4_INTERNAL_KEY}')
 (J/source).write_text(text,encoding='utf-8')
(J/'ExceptionApplication.java').write_text('package edu.hfut.incidents;import org.springframework.boot.*;import org.springframework.boot.autoconfigure.*;import org.springframework.cloud.openfeign.*;import org.springframework.cloud.netflix.hystrix.*;import org.mybatis.spring.annotation.MapperScan;@SpringBootApplication @EnableFeignClients @EnableHystrix @MapperScan("edu.hfut.incidents.dao") public class ExceptionApplication {public static void main(String[]a){SpringApplication.run(ExceptionApplication.class,a);}}',encoding='utf-8')
props=(R/'backend/access-service/src/main/resources/application.properties').read_text().replace('server.port=19841','server.port=19851').replace('spring.application.name=access-service','spring.application.name=exception-service').replace('${P4_DB_','${P4C_DB_')
(S/'application.properties').write_text(props+'\np4c.disposition.enabled=false\n',encoding='utf-8')
(S/'exception-agent.model.json').write_bytes((R/'campus-access-web/server/agents/exception-agent.model.json').read_bytes())
schema=(R/'campus-access-web/server/db/schema.sql').read_text(encoding='utf-8');import re
tables=[]
for table in ['exceptions','blacklist']:
 m=re.search(r'CREATE TABLE IF NOT EXISTS '+table+r'\s*\(.*?;',schema,re.S|re.I);assert m,table;tables.append(m.group().replace('sort_order INT','sort_order BIGINT'))
extra='''
CREATE TABLE IF NOT EXISTS incident_inbox(event_id VARCHAR(128) PRIMARY KEY, payload_digest CHAR(64) NOT NULL, exception_id VARCHAR(128), received_at VARCHAR(64) NOT NULL);
CREATE TABLE IF NOT EXISTS incident_outbox(event_id VARCHAR(128) PRIMARY KEY,payload LONGTEXT NOT NULL,state VARCHAR(32) NOT NULL DEFAULT 'PENDING',attempts INT NOT NULL DEFAULT 0,next_retry_at BIGINT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS incident_requests(request_id VARCHAR(191) PRIMARY KEY,payload_digest CHAR(64) NOT NULL,response LONGTEXT NOT NULL);
CREATE TABLE IF NOT EXISTS incident_locks(id VARCHAR(32) PRIMARY KEY);
INSERT IGNORE INTO incident_locks(id) VALUES('blacklist');
CREATE TABLE IF NOT EXISTS incident_faults(name VARCHAR(32) PRIMARY KEY,remaining INT NOT NULL DEFAULT 0);
'''
(S/'db/migration/V001__exception_schema.sql').write_text('\n'.join(tables)+extra,encoding='utf-8')
p=R/'backend/pom.xml';text=p.read_text();text=text.replace('</modules>','<module>exception-service</module></modules>') if '<module>exception-service</module>' not in text else text;p.write_text(text,encoding='utf-8')
p=R/'.gitignore';text=p.read_text(encoding='utf-8');p.write_text(text+('\n.p4c-local/\n' if '.p4c-local/' not in text else ''),encoding='utf-8')
print('Created isolated exception module scaffold with locked dependencies')
