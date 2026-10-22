from pathlib import Path
import subprocess,json,datetime
R=Path(__file__).resolve().parents[1];E=R/'docs/p4c-evidence'/('verification-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S%f'));E.mkdir();results=[]
scripts=['p4c-ready.mjs','p4c-core-test.mjs','p4c-security-test.mjs','p4c-integration-test.mjs','p4c-regression-core-test.mjs','p4c-regression-query-contract-test.mjs','p4c-regression-config-test.mjs','p4c-regression-issuance-test.mjs','p4c-regression-race-test.mjs','p4c-fault-test.mjs','p4c-architecture-test.mjs','p4c-regression-browser-test.mjs']
for name in scripts:
 p=subprocess.run(['node','docs/'+name],cwd=R,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace');(E/(name+'.txt')).write_text(p.stdout,encoding='utf-8');results.append({'script':name,'exitCode':p.returncode});(E/'summary.json').write_text(json.dumps({'complete':len(results)==len(scripts),'allPassed':all(x['exitCode']==0 for x in results),'results':results},indent=2),encoding='utf-8');print(name,p.returncode,p.stdout.strip(),flush=True)
 if p.returncode:raise SystemExit(p.returncode)
