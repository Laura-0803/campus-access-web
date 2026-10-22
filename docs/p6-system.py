"""Isolated P6 runtime: Java backend plus existing production React build, no Express."""
from pathlib import Path
import sys,os,json,subprocess,time,socket,datetime
R=Path(__file__).resolve().parents[1];E=R/'docs/p6-evidence';action=sys.argv[1] if len(sys.argv)>1 else 'status'
env={**os.environ,'P6_ROUTE':'true'}
ports=[19761,19762,19800,19811,19813,19821,19841,19851,19853,19861,15173]
def states():
 result={}
 for p in ports+[19830]:
  with socket.socket() as s:s.settimeout(.2);result[str(p)]=s.connect_ex(('127.0.0.1',p))==0
 return result
def run(*args):return subprocess.run(args,cwd=R,env=env,check=False).returncode
def save(name,data):
 E.mkdir(exist_ok=True);p=E/(name+'-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S%f')+'.json');p.write_text(json.dumps(data,indent=2),encoding='utf-8');print(json.dumps({'evidence':p.relative_to(R).as_posix(),**data}))
if action=='status':save('status',{'listening':states(),'ownedStatePresent':(R/'.p6-local/processes.json').exists()})
elif action=='health':raise SystemExit(run('node','docs/p6-ready.mjs'))
elif action=='start':
 if not(R/'campus-access-web/dist/index.html').exists():raise SystemExit('Production React dist missing; build original frontend explicitly')
 if any(states().values()):raise SystemExit('A test port is occupied; inspect ownership and stop before start')
 if run('python','docs/p6-prepare-runtime.py') or run('python','docs/p6-runtime.py','start') or run('node','docs/p6-ready.mjs'):
  run('python','docs/p6-runtime.py','stop');raise SystemExit(1)
elif action=='stop':
 rc=run('python','docs/p6-runtime.py','stop');end=time.monotonic()+15
 while any(states().values()) and time.monotonic()<end:time.sleep(.2)
 current=states();save('closure',{'portsClosed':{p:not v for p,v in current.items()},'ownedStateRemoved':not(R/'.p6-local/processes.json').exists(),'pass':rc==0 and not any(current.values())});raise SystemExit(0 if rc==0 and not any(current.values()) else 1)
else:raise SystemExit('Use start/health/status/stop')
