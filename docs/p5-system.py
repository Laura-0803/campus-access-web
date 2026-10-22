from pathlib import Path
import sys,subprocess,os,json,socket,datetime
R=Path(__file__).resolve().parents[1];E=R/'docs/p5-evidence';E.mkdir(exist_ok=True);action=sys.argv[1] if len(sys.argv)>1 else 'status';ports=[19761,19762,19800,19811,19813,19821,19841,19851,19853,19830,15173]
def run(args,timeout=240):return subprocess.run(args,cwd=R,env=os.environ.copy(),timeout=timeout).returncode
if action=='prepare':raise SystemExit(run(['python','docs/p5-prepare.py']))
if action=='status':
 states={}
 for p in ports:
  with socket.socket()as s:s.settimeout(.3);states[str(p)]=s.connect_ex(('127.0.0.1',p))==0
 print(json.dumps({'portsListening':states,'ownedStatePresent':(R/'.p5-local/processes.json').exists()}));raise SystemExit
if action=='health':raise SystemExit(run(['node','docs/p5-health.mjs']))
if action=='stop':
 rc=run(['python','docs/p5-runtime-internal.py','stop']);states={}
 for p in ports:
  with socket.socket()as s:s.settimeout(.3);states[str(p)]=s.connect_ex(('127.0.0.1',p))!=0
 result={'checkedAt':datetime.datetime.now().isoformat(),'portsClosed':states,'ownedStateRemoved':not(R/'.p5-local/processes.json').exists(),'pass':rc==0 and all(states.values())};(E/('closure-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S%f')+'.json')).write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps({'allTestPortsClosed':result['pass']}));raise SystemExit(0 if result['pass'] else 1)
if action=='start':
 if not(R/'.p5-local/runtime.json').exists():
  if run(['python','docs/p5-prepare.py']):raise SystemExit(1)
 # Do not seed/reset a database or silently rebuild reviewed artifacts.
 for m in ['eureka-server','gateway-service','user-service','appointment-service','access-service','exception-service']:
  if not(R/'backend'/m/'target'/(m+'-0.2.0-SNAPSHOT.jar')).exists():raise SystemExit('Missing reviewed JAR: '+m+'; build explicitly using docs/p2-maven.ps1 with a new evidence directory')
 try:
  if (R/'.p5-local/processes.json').exists():
   # Repeated start checks the already owned system, never launches duplicate processes.
   if run(['node','docs/p5-health.mjs'])==0:raise SystemExit(0)
   raise RuntimeError('Owned state exists but unhealthy; inspect evidence and run stop before retry')
  if run(['python','docs/p5-runtime-internal.py','start'],200)!=0:raise RuntimeError('Process startup gate failed')
  if run(['node','docs/p5-ready.mjs']) or run(['node','docs/p5-health.mjs']):raise RuntimeError('Layered health gate failed')
 except (RuntimeError,subprocess.TimeoutExpired)as e:
  print(str(e));run(['python','docs/p5-runtime-internal.py','stop']);raise SystemExit(1)
 print('P5 isolated system ready: http://127.0.0.1:15173');raise SystemExit
raise SystemExit('Use prepare/start/health/status/stop')
