"""Sequential P7 runtime regression; each original script remains untouched."""
from pathlib import Path
import subprocess,datetime,json,time
R=Path(__file__).resolve().parents[1];E=R/'docs/p7-evidence'/('verification-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S%f'));E.mkdir()
scripts=['p7-regression-access-test.mjs','p7-regression-incident-test.mjs','p7-regression-security-test.mjs','p7-regression-config-test.mjs','p7-browser-flow.mjs','p7-browser-abf.mjs','p7-components-test.mjs','p7-ready.mjs','p7-persistence.mjs','p7-ready.mjs','p7-report-visual.mjs']
results=[]
for i,name in enumerate(scripts):
 t=time.monotonic();p=subprocess.run(['node','docs/'+name],cwd=R,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace')
 log=f'{i+1:02d}-{name}.log';(E/log).write_text(p.stdout,encoding='utf-8');row={'script':name,'exitCode':p.returncode,'elapsedSeconds':round(time.monotonic()-t,2),'log':log};results.append(row)
 (E/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8');print(json.dumps(row),flush=True)
 if p.returncode:raise SystemExit(p.returncode)
print(json.dumps({'evidence':E.relative_to(R).as_posix(),'pass':True}))
