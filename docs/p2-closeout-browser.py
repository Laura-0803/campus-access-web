"""Run browser regression on isolated services; record and stop only this extra Vite PID."""
from pathlib import Path
import json,os,subprocess,time,socket,urllib.request,sys
R=Path(__file__).resolve().parents[1];L=R/'.p2-local'
E=R/'docs/p2-evidence'/('browser-run-'+time.strftime('%Y%m%dT%H%M%S'));E.mkdir()
with socket.socket() as s:
 if s.connect_ex(('127.0.0.1',15174))==0:raise SystemExit('15174 occupied')
config=L/'vite.normal.config.mjs'
config.write_text('import original from '+json.dumps((R/'campus-access-web/vite.config.js').as_uri())+';export default {...original,root:'+json.dumps(str(R/'campus-access-web'))+',server:{host:"127.0.0.1",port:15174,strictPort:true,proxy:{"/api":"http://127.0.0.1:19812"}}};',encoding='utf-8')
log=(E/'normal-vite.log').open('wb')
p=subprocess.Popen(['node',str(R/'campus-access-web/node_modules/vite/bin/vite.js'),'--config',str(config)],cwd=R/'campus-access-web',stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
try:
 ready=False
 for _ in range(60):
  try:
   with urllib.request.urlopen('http://127.0.0.1:15174/api/roles',timeout=2) as res:ready=json.load(res).get('success') is True
   if ready:break
  except Exception:pass
  time.sleep(.5)
 if not ready:raise RuntimeError('normal UI readiness timeout')
 # Registration and local Ribbon caches settle independently of Vite readiness.
 # Gate real browser traffic on every layer, never a fixed sleep.
 cfg=json.loads((L/'runtime.json').read_text(encoding='utf-8'))
 observations=[];deadline=time.monotonic()+120
 while time.monotonic()<deadline:
  layers={}
  for name,url in [('gateway','http://127.0.0.1:19800/api/roles'),('eureka1','http://127.0.0.1:19761/eureka/apps/USER-SERVICE'),('eureka2','http://127.0.0.1:19762/eureka/apps/USER-SERVICE'),('ribbon','http://127.0.0.1:19811/internal/components')]:
   try:
    req=urllib.request.Request(url,headers={'Accept':'application/json',**({'X-Campus-Internal':cfg['internalKey']} if name=='ribbon' else {})})
    with urllib.request.urlopen(req,timeout=2) as res:data=json.load(res)
    layers[name]=any(i['status']=='UP' and i['port']['$']==19811 for i in data['application']['instance']) if name.startswith('eureka') else '19830' in data['servers'] if name=='ribbon' else data.get('success') is True
   except Exception:layers[name]=False
  observations.append(layers)
  (E/'startup-gate.json').write_text(json.dumps(observations,indent=2),encoding='utf-8')
  if all(layers.values()):break
  time.sleep(.5)
 if not all(layers.values()):raise RuntimeError('Layered browser startup timeout; no browser assertions run')
 result=subprocess.run(['node','docs/p2-browser-test.mjs'],cwd=R,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace')
 (E/'browser.log').write_text(result.stdout,encoding='utf-8');print(result.stdout,flush=True)
 (E/'result.json').write_text(json.dumps({'realBrowserInvoked':True,'exitCode':result.returncode,'normalUiPort':15174}),encoding='utf-8')
finally:
 p.terminate();p.wait(timeout=15);log.close()
 (E/'extra-process-closure.json').write_text(json.dumps({'pid':p.pid,'exitCode':p.returncode,'ownedNormalViteStopped':p.poll() is not None}),encoding='utf-8')
sys.exit(result.returncode)
