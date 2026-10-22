from pathlib import Path
import subprocess,json,zipfile,hashlib,datetime
R=Path(__file__).resolve().parents[1];jdk=json.loads((R/'.p1-local/jdk.json').read_text(encoding='utf-8-sig'))['javaHome'];report={}
for name,cmd in [('isolatedJava',[str(Path(jdk)/'bin/java.exe'),'-version']),('defaultJava',['java','-version'])]:
 p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace');report[name]={'exitCode':p.returncode,'version':p.stdout.strip()}
jar=R/'backend/access-service/target/access-service-0.2.0-SNAPSHOT.jar'
with zipfile.ZipFile(jar)as z:report['actualRuntimeLibraries']=sorted(p[len('BOOT-INF/lib/'):]for p in z.namelist()if p.startswith('BOOT-INF/lib/')and p.endswith('.jar'))
report['accessJarSha256']=hashlib.sha256(jar.read_bytes()).hexdigest();report['frameworkReplacement']=False
p=R/'docs/p4-evidence'/('environment-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'.json');p.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('Recorded actual isolated/default Java versions and executable JAR libraries')
