"""Reconcile runtime-JAR identities with the actual Maven dependency tree."""
from pathlib import Path
import json,csv,re
root=Path(__file__).resolve().parent.parent
e=root/'docs/p1-evidence'
raw=(e/'dependency-tree.log').read_bytes()
text=raw.decode('utf-16') if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else raw.decode('utf8',errors='replace')
assert 'BUILD SUCCESS' in text
coordinates={}
for g,a,v,scope in re.findall(r'([\w.-]+):([\w.-]+):jar:([\w.-]+):(compile|runtime|test|provided)',text):
 coordinates[a+'-'+v+'.jar']=(g,a,v)
rows=list(csv.DictReader((e/'runtime-dependencies.csv').open(encoding='utf-8-sig')))
for row in rows:
 if row['runtimeJar'] in coordinates:
  row['groupId'],row['artifactId'],row['version']=coordinates[row['runtimeJar']]
with (e/'runtime-dependencies.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
names=['spring-boot','spring-cloud-netflix-eureka-server','spring-cloud-netflix-eureka-client','eureka-client','eureka-core','spring-cloud-openfeign-core','spring-cloud-netflix-ribbon','spring-cloud-netflix-hystrix','spring-cloud-gateway-server','ribbon-core','hystrix-core','feign-core','feign-hystrix','mybatis','mybatis-spring','mybatis-spring-boot-autoconfigure','mysql-connector-java']
versions={name:sorted({r['version'] for r in rows if r['artifactId']==name}) for name in names}
assert all(versions.values())
(e/'key-versions.json').write_text(json.dumps(versions,indent=2)+'\n',encoding='utf8')
(e/'dependency-tree.txt').write_text(text,encoding='utf8')
print(json.dumps(versions))
