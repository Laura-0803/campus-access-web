from pathlib import Path
import json,subprocess,zipfile,hashlib
R=Path(__file__).resolve().parents[1];jdk=json.loads((R/'.p1-local/jdk.json').read_text(encoding='utf-8-sig'))['javaHome'];report={}
for name,cmd in [('isolatedJava',[str(Path(jdk)/'bin/java.exe'),'-version']),('defaultJava',['java','-version'])]:
 p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace');report[name]={'exitCode':p.returncode,'version':p.stdout}
report['jars']={}
for module in ['eureka-server','gateway-service','user-service','appointment-service','access-service','exception-service']:
 jar=R/'backend'/module/'target'/(module+'-0.2.0-SNAPSHOT.jar')
 with zipfile.ZipFile(jar)as z:libs=sorted(n[len('BOOT-INF/lib/'):]for n in z.namelist()if n.startswith('BOOT-INF/lib/')and n.endswith('.jar'))
 report['jars'][module]={'sha256':hashlib.sha256(jar.read_bytes()).hexdigest(),'actualRuntimeLibraries':libs}
(R/'docs/p5-evidence/environment-final.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('Actual JDK versions, all executable JAR hashes and runtime libraries recorded')

prior=json.loads((R/"docs/p4c-evidence/environment-final.json").read_text(encoding="utf-8"));same=all(report["jars"][m]["sha256"]==prior["jars"][m]["sha256"] for m in prior["jars"]);assert same
(R/"docs/p5-evidence/reviewed-jars-verification.json").write_text(json.dumps({"allSixReviewedJarHashesUnchanged":same,"newMavenBuildClaimed":False},indent=2),encoding="utf-8")
