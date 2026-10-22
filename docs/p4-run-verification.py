from pathlib import Path
import subprocess,json,datetime
R=Path(__file__).resolve().parents[1];E=R/'docs/p4-evidence'/('verification-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S%f'));E.mkdir()
results=[]
scripts=['p4-ready.mjs','p4-core-test.mjs','p4-query-contract-test.mjs','p4-config-test.mjs','p4-security-test.mjs','p4-issuance-test.mjs','p4-race-test.mjs','p4-architecture-test.mjs','p4-browser-test.mjs']
for name in scripts:
 p=subprocess.run(['node','docs/'+name],cwd=R,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace')
 (E/(name+'.txt')).write_text(p.stdout,encoding='utf-8');results.append({'script':name,'exitCode':p.returncode});(E/'summary.json').write_text(json.dumps({'complete':len(results)==len(scripts),'allPassed':all(r['exitCode']==0 for r in results),'results':results},indent=2),encoding='utf-8');print(name,p.returncode,p.stdout.strip(),flush=True)
 if p.returncode:raise SystemExit(p.returncode)
