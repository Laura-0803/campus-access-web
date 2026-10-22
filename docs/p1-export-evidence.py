"""Export sanitized runtime artifact versions and build summary from real JARs/reports."""
from pathlib import Path
import zipfile, io, csv, json, hashlib, xml.etree.ElementTree as ET
root=Path(__file__).resolve().parent.parent
project=root/'experiments/p1-legacy-lab';out=root/'docs/p1-evidence';out.mkdir(exist_ok=True)
versions=[];artifacts=[]
for module in ['eureka-server','provider-service','consumer-service','gateway-service']:
 jar=project/module/'target'/f'{module}-0.1.0-SNAPSHOT.jar'
 assert jar.is_file(), 'Missing compiled artifact: '+module
 artifacts.append({'module':module,'jar':str(jar.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(jar.read_bytes()).hexdigest()})
 with zipfile.ZipFile(jar) as outer:
  for name in outer.namelist():
   if not name.startswith('BOOT-INF/lib/') or not name.endswith('.jar'):continue
   raw=outer.read(name);jarname=name.split('/')[-1];properties=[]
   with zipfile.ZipFile(io.BytesIO(raw)) as inner:
    for entry in inner.namelist():
     if entry.startswith('META-INF/maven/') and entry.endswith('/pom.properties'):
      values={}
      for line in inner.read(entry).decode('utf8',errors='replace').splitlines():
       if '=' in line and not line.startswith('#'):
        k,v=line.split('=',1);values[k.strip()]=v.strip()
      if all(k in values for k in ['groupId','artifactId','version']):properties.append(values)
   if properties:
    for values in properties:versions.append([module,values['groupId'],values['artifactId'],values['version'],jarname,hashlib.sha256(raw).hexdigest()])
   else:versions.append([module,'(see Maven dependency tree)','(jar filename)',jarname,jarname,hashlib.sha256(raw).hexdigest()])
with (out/'runtime-dependencies.csv').open('w',encoding='utf-8-sig',newline='') as f:
 writer=csv.writer(f);writer.writerow(['module','groupId','artifactId','version','runtimeJar','sha256']);writer.writerows(versions)
tests=[]
for report in project.rglob('target/surefire-reports/TEST-*.xml'):
 node=ET.parse(report).getroot()
 tests.append({'suite':node.attrib['name'],'tests':int(node.attrib['tests']),'errors':int(node.attrib['errors']),'failures':int(node.attrib['failures']),'skipped':int(node.attrib.get('skipped',0)),'cases':[x.attrib['name'] for x in node.findall('testcase')]})
assert tests and all(t['errors']==t['failures']==t['skipped']==0 for t in tests)
result={'artifacts':artifacts,'testSuites':tests,'totalTests':sum(t['tests'] for t in tests),'runtimeDependencyEntries':len(versions),'allTestsPassed':True}
(out/'compiled-artifacts.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
raw=(out/'maven-verify.log').read_bytes()
text=raw.decode('utf-16') if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else raw.decode('utf8',errors='replace')
assert 'BUILD SUCCESS' in text
selected=[line for line in text.splitlines() if any(s in line for s in ['Tests run:','Reactor Summary','p1-legacy-lab ....','eureka-server ....','provider-service ....','consumer-service ....','gateway-service ....','BUILD SUCCESS','Total time:','Finished at:'])]
(out/'maven-summary.txt').write_text('\n'.join(selected)+'\n',encoding='utf8')
keynames=['spring-boot','spring-cloud-netflix-eureka-server','spring-cloud-netflix-eureka-client','spring-cloud-openfeign-core','spring-cloud-netflix-ribbon','spring-cloud-netflix-hystrix','spring-cloud-gateway-core','ribbon-core','hystrix-core','feign-core','feign-hystrix','mybatis','mybatis-spring','mybatis-spring-boot-autoconfigure','mysql-connector-java']
keys={k:sorted({r[3] for r in versions if r[2]==k}) for k in keynames}
# Some upstream artifacts do not embed Maven properties; the exact runtime filenames remain evidence.
keys['unmatchedKeyRuntimeJars']=[r[4] for r in versions if r[1]=='(see Maven dependency tree)' and any(k in r[4] for k in keynames)]
(out/'key-versions.json').write_text(json.dumps(keys,indent=2)+'\n',encoding='utf8')
print(json.dumps({'totalTests':result['totalTests'],'compiledModules':len(artifacts),'keyVersions':keys}))
