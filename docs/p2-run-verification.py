from pathlib import Path
import subprocess,json,time,sys,urllib.request
R=Path(__file__).resolve().parents[1];E=R/'docs/p2-evidence'/('verification-'+time.strftime('%Y%m%dT%H%M%S'));E.mkdir();results=[]
cfg=json.loads((R/'.p2-local/runtime.json').read_text(encoding='utf-8'));deadline=time.monotonic()+120;observations=[]
while time.monotonic()<deadline:
 layers={}
 for name,url in [('gateway','http://127.0.0.1:19800/api/roles'),('normal','http://127.0.0.1:19812/api/roles'),('eureka1','http://127.0.0.1:19761/eureka/apps/USER-SERVICE'),('eureka2','http://127.0.0.1:19762/eureka/apps/USER-SERVICE'),('ribbon','http://127.0.0.1:19811/internal/components')]:
  try:
   req=urllib.request.Request(url,headers={'Accept':'application/json',**({'X-Campus-Internal':cfg['internalKey']} if name=='ribbon' else {})})
   with urllib.request.urlopen(req,timeout=2) as r:data=json.load(r)
   layers[name]=any(i['status']=='UP' and i['port']['$']==19811 for i in data['application']['instance']) if name.startswith('eureka') else '19830' in data['servers'] if name=='ribbon' else data.get('success') is True
  except Exception:layers[name]=False
 observations.append(layers)
 if all(layers.values()):break
 time.sleep(1)
(E/'startup-gate.json').write_text(json.dumps(observations,indent=2),encoding='utf-8')
if not all(layers.values()):raise SystemExit('Layered startup timeout; no business sampling performed')
for name in ['p2-batch1-test.mjs','p2-batch2-test.mjs','p2-batch3-test.mjs','p2-transaction-test.mjs','p2-contract-test.mjs','p2-react-component-test.mjs','p2-coexist-test.mjs','p2-safety-edge-test.mjs','p2-batch1-failure-test.mjs']:
 p=subprocess.run(['node',str(R/'docs'/name)],cwd=R,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace')
 (E/(name+'.txt')).write_text(p.stdout,encoding='utf-8');results.append({'script':name,'exitCode':p.returncode});(E/'summary.json').write_text(json.dumps(results,indent=2),encoding='utf-8');print(name,':',p.returncode,flush=True)
 if p.returncode:raise SystemExit(p.returncode)
print('All listed verifications passed; browser visual testing and personnel deletion are not included')
