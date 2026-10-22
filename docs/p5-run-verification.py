from pathlib import Path
import subprocess,json,datetime,os
R=Path(__file__).resolve().parents[1];E=R/'docs/p5-evidence'/('verification-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S%f'));E.mkdir();results=[];env={**os.environ,'P5_FAULT_TEST':'true'}
scripts=['p5-ready.mjs','p5-core-test.mjs','p5-security-test.mjs','p5-integration-test.mjs','p5-regression-core-test.mjs','p5-regression-query-contract-test.mjs','p5-regression-config-test.mjs','p5-aggregate-test.mjs','p5-fault-test.mjs','p5-architecture-test.mjs','p5-regression-browser-test.mjs']
import sys,shutil
if len(sys.argv)>2 and sys.argv[1]=='--resume':
 prior=R/sys.argv[2]
 for x in json.loads((prior/'summary.json').read_text())['results']:
  if x['exitCode']!=0:break
  shutil.copy2(prior/(x['script']+'.txt'),E/(x['script']+'.txt'));results.append({**x,'reusedPassedEvidenceFrom':str(prior.relative_to(R))})
 scriptsToRun=scripts[len(results):]
else:scriptsToRun=scripts
for name in scriptsToRun:
 p=subprocess.run(['node','docs/'+name],cwd=R,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace');(E/(name+'.txt')).write_text(p.stdout,encoding='utf-8');results.append({'script':name,'exitCode':p.returncode});(E/'summary.json').write_text(json.dumps({'complete':len(results)==len(scripts),'allPassed':all(x['exitCode']==0 for x in results),'results':results},indent=2),encoding='utf-8');print(name,p.returncode,p.stdout.strip(),flush=True)
 if p.returncode:raise SystemExit(p.returncode)
