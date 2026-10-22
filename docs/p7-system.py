"""P7 audit runtime commands for an already prepared isolated workstation, not bootstrap."""
from pathlib import Path
import os,sys,subprocess,socket,json,datetime,time
R=Path(__file__).resolve().parents[1];E=R/'docs/p7-evidence';E.mkdir(exist_ok=True)
action=sys.argv[1] if len(sys.argv)>1 else 'status'
ports=[19761,19762,19800,19811,19813,19821,19841,19851,19853,19861,15173,19830]
def states():
 result={}
 for port in ports:
  with socket.socket() as s:s.settimeout(.2);result[str(port)]=s.connect_ex(('127.0.0.1',port))==0
 return result
def run(*args):return subprocess.run(args,cwd=R,env={**os.environ,'P6_ROUTE':'true'},check=False).returncode
def save(name,data):
 p=E/(name+'-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S%f')+'.json');p.write_text(json.dumps(data,indent=2),encoding='utf-8');print(json.dumps({'evidence':p.relative_to(R).as_posix(),**data}))
if action=='status':save('status',{'listening':states(),'ownedStatePresent':(R/'.p6-local/processes.json').exists()})
elif action=='health':raise SystemExit(run('node','docs/p7-ready.mjs'))
elif action=='start':
 if any(states().values()):raise SystemExit('Port occupied; inspect ownership, use stop for owned runtime first')
 if not(R/'campus-access-web/dist/index.html').exists():raise SystemExit('Existing production React build required')
 if run('python','docs/p7-runtime.py','start') or run('node','docs/p7-ready.mjs'):
  run('python','docs/p7-runtime.py','stop');raise SystemExit(1)
elif action=='stop':
 rc=run('python','docs/p7-runtime.py','stop');end=time.monotonic()+15
 while any(states().values()) and time.monotonic()<end:time.sleep(.2)
 current=states();ok=rc==0 and not any(current.values())
 save('closure',{'portsClosed':{p:not v for p,v in current.items()},'ownedStateRemoved':not(R/'.p6-local/processes.json').exists(),'pass':ok});raise SystemExit(0 if ok else 1)
else:raise SystemExit('Use start|health|status|stop')
