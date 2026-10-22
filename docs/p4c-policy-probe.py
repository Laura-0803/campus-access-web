from pathlib import Path
import subprocess,json,datetime
R=Path(__file__).resolve().parents[1];jdk=json.loads((R/'.p1-local/jdk.json').read_text(encoding='utf-8-sig'))['javaHome']
p=subprocess.run([str(Path(jdk)/'bin/java.exe'),'-Dfile.encoding=UTF-8','-cp',str(R/'backend/access-service/target/classes'),str(R/'docs/P4CPolicyProbe.java')],cwd=R,stdout=subprocess.PIPE,stderr=subprocess.PIPE,encoding='utf-8',errors='replace');out=R/'docs/p4c-evidence'/('policy-probe-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'.json')
if p.returncode:out.write_text(json.dumps({'ran':False,'exitCode':p.returncode,'diagnostic':p.stderr},ensure_ascii=False,indent=2),encoding='utf-8');raise SystemExit(p.returncode)
report=json.loads(p.stdout);out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('Actual policy probed; restrictive parse-failure safety remains NOT passed and pending approval')
