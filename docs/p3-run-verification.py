"""Bounded readiness + sequential real P3 suites. Stops on first failure."""
from pathlib import Path
import json,subprocess,time,urllib.request,urllib.error
from datetime import datetime
R=Path(__file__).resolve().parents[1];cfg=json.loads((R/'.p3-local/runtime.json').read_text());E=R/'docs/p3-evidence'/('verification-'+datetime.now().strftime('%Y%m%dT%H%M%S%f'));E.mkdir()
deadline=time.monotonic()+150;observations=[]
while time.monotonic()<deadline:
 layers={}
 for name,url,key in [('adapter','http://127.0.0.1:19830/api/health','X-Adapter-Key'),('ribbon','http://127.0.0.1:19821/internal/components','X-Campus-Internal'),('gateway','http://127.0.0.1:19800/api/appointments','')]:
  try:
   req=urllib.request.Request(url,headers={key:cfg['adapterKey' if name=='adapter' else 'internalKey']} if key else {})
   with urllib.request.urlopen(req,timeout=3) as r:data=json.load(r)
   layers[name]=data.get('success') is True if name=='adapter' else all(str(p) in data['servers'] for p in [19811,19813]) if name=='ribbon' else False
  except urllib.error.HTTPError as error:layers[name]=name=='gateway' and error.code==401 and error.headers.get('X-P3-Service')=='appointment-service'
  except Exception:layers[name]=False
 observations.append(layers);(E/'startup-gate.json').write_text(json.dumps(observations,indent=2))
 if all(layers.values()):break
 time.sleep(.5)
if not all(layers.values()):raise SystemExit('P3 layered readiness timeout; no suites started')
results=[]
for name in ['p3-query-test.mjs','p3-write-test.mjs','p3-write-safety-test.mjs','p3-consistency-test.mjs','p3-fault-test.mjs','p3-browser-test.mjs','p3-blacklist-failure-test.mjs']:
 p=subprocess.run(['node','docs/'+name],cwd=R,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace')
 (E/(name+'.txt')).write_text(p.stdout,encoding='utf-8');results.append({'script':name,'exitCode':p.returncode});(E/'summary.json').write_text(json.dumps(results,indent=2));print(name,p.returncode,p.stdout.strip(),flush=True)
 if p.returncode:raise SystemExit(p.returncode)
