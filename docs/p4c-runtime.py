"""Start/stop only isolated P4-owned processes. Never changes JAVA_HOME globally."""
from pathlib import Path
import os,json,subprocess,sys,time,socket,urllib.request,ctypes
from ctypes import wintypes
from datetime import datetime
def process_stamp(pid,expected=None,terminate=False):
 k=ctypes.WinDLL('kernel32',use_last_error=True);k.OpenProcess.restype=wintypes.HANDLE;h=k.OpenProcess(0x1001,False,pid)
 if not h:return None
 try:
  times=[wintypes.FILETIME() for _ in range(4)]
  if not k.GetProcessTimes(h,*[ctypes.byref(t) for t in times]):return None
  stamp=(times[0].dwHighDateTime<<32)+times[0].dwLowDateTime
  if terminate and expected==stamp:k.TerminateProcess(h,0)
  return stamp
 finally:k.CloseHandle(h)
R=Path(__file__).resolve().parents[1];L=R/'.p4c-local';cfg=json.loads((L/'runtime.json').read_text(encoding='utf-8'));state=L/'processes.json';action=sys.argv[1]
owned=json.loads(state.read_text()) if state.exists() else []
if action in ['stop','halt']:
 remaining=[]
 for p in owned:
  if action=='stop' or p['name']==sys.argv[2]:process_stamp(p['pid'],p['created'],True)
  else:remaining.append(p)
 if remaining:state.write_text(json.dumps(remaining))
 elif state.exists():state.unlink()
 print('Stopped selected owned P4 processes');raise SystemExit
if action=='start' and owned:raise SystemExit('Owned P4 process state exists')
ports=[19761,19762,19800,19811,19813,19821,19830,19841,19851,19853,15173]
if action=='start':
 for port in ports:
  with socket.socket() as s:
   if s.connect_ex(('127.0.0.1',port))==0:raise SystemExit('Port occupied: '+str(port))
jdk=json.loads((R/'.p1-local/jdk.json').read_text(encoding='utf-8-sig'))['javaHome'];java=str(Path(jdk)/'bin/java.exe')
env={**os.environ,'P2_WORKSPACE':str(R),'P2_DB_URL':f"jdbc:mysql://127.0.0.1:{cfg['port']}/{cfg['database']}?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=UTF-8",'P2_DB_USER':cfg['username'],'P2_DB_PASSWORD':cfg['password'],'P2_INTERNAL_KEY':cfg['internalKey'],'P2_ADAPTER_KEY':cfg['adapterKey'],'P2_DEMO':'true','P2_DEMO_PHONES':','.join(cfg['allowedPhones']),'SPRING_PROFILES_ACTIVE':'synthetic-demo','P4_MODE':'true','P4_INTERNAL_KEY':cfg['internalKey'],'P3_DB_URL':f"jdbc:mysql://127.0.0.1:{cfg['port']}/{cfg['appointmentDatabase']}?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=UTF-8",'P3_DB_USER':cfg['appointmentUser'],'P3_DB_PASSWORD':cfg['appointmentPassword']}
env.update({'P3_MODE':'true','P3_INTERNAL_KEY':cfg['internalKey'],'P4_DB_URL':f"jdbc:mysql://127.0.0.1:{cfg['port']}/{cfg['accessDatabase']}?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=UTF-8",'P4_DB_USER':cfg['accessUser'],'P4_DB_PASSWORD':cfg['accessPassword']})
env.update({'P4_RECOVERY_KEY':cfg['recoveryKey'],'P4_FAULT_INJECTION':'true'})
env.update({'P4C_MODE':'true','P4C_EXCEPTION_SERVICE':'exception-service','P4C_FAULT_INJECTION':'true','P4C_DB_URL':f"jdbc:mysql://127.0.0.1:{cfg['port']}/{cfg['exceptionDatabase']}?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=UTF-8",'P4C_DB_USER':cfg['exceptionUser'],'P4C_DB_PASSWORD':cfg['exceptionPassword']})
env.pop('DEBUG',None)
E=R/'docs/p4c-evidence'/('runtime-'+datetime.now().strftime('%Y%m%dT%H%M%S%f'));E.mkdir()
def jar(module):return str(R/'backend'/module/'target'/(module+'-0.2.0-SNAPSHOT.jar'))
def launch(name,command,extra=None,cwd=R):
 log=(E/(name+'.log')).open('wb');p=subprocess.Popen(command,cwd=cwd,env={**env,**(extra or {})},stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 owned.append({'name':name,'pid':p.pid,'created':process_stamp(p.pid)});state.write_text(json.dumps(owned))
def user(name,port):launch(name,[java,'-Xmx224m','-jar',jar('user-service'),'--server.port='+str(port),'--p3.internal.enabled=true','--p4.internal.enabled=true','--p4c.internal.enabled=true'])
if action=='restart':
 name=sys.argv[2]
 if any(p['name']==name for p in owned):raise SystemExit('Halt component before restart')
 if name in ['user1','user2']:user(name,19811 if name=='user1' else 19813)
 elif name=='appointment':launch(name,[java,'-Xmx256m','-jar',jar('appointment-service'),'--p4.internal.enabled=true','--p4.final.enabled='+str(cfg.get('finalEnabled',False)).lower()])
 elif name=='access':launch(name,[java,'-Xmx256m','-jar',jar('access-service')])
 elif name in ['exception1','exception2']:launch(name,[java,'-Xmx224m','-jar',jar('exception-service'),'--server.port='+str(19851 if name=='exception1' else 19853),'--p4c.disposition.enabled='+str(cfg.get('dispositionEnabled',False)).lower()])
 elif name=='adapter':launch(name,['node',str(R/'backend/p4c-legacy-adapter/server.mjs')])
 else:raise SystemExit('Unsupported restart component')
 print('Restarted owned P4 component:',name);raise SystemExit
for name,port,host,peer in [('registry1',19761,'localhost','127.0.0.1:19762'),('registry2',19762,'127.0.0.1','localhost:19761')]:launch(name,[java,'-Xmx160m','-jar',jar('eureka-server'),'--server.port='+str(port)],{'REGISTRY_HOST':host,'PEER_URL':'http://'+peer+'/eureka/'})
user('user1',19811);user('user2',19813)
launch('appointment',[java,'-Xmx256m','-jar',jar('appointment-service'),'--p4.internal.enabled=true','--p4.final.enabled='+str(cfg.get('finalEnabled',False)).lower()])
launch('access',[java,'-Xmx256m','-jar',jar('access-service')])
for name,port in [('exception1',19851),('exception2',19853)]:launch(name,[java,'-Xmx224m','-jar',jar('exception-service'),'--server.port='+str(port),'--p4c.disposition.enabled='+str(cfg.get('dispositionEnabled',False)).lower()])
launch('adapter',['node',str(R/'backend/p4c-legacy-adapter/server.mjs')])
launch('gateway',[java,'-Xmx192m','-jar',jar('gateway-service')])
vite=L/'vite.config.mjs';vite.write_text('import original from '+json.dumps((R/'campus-access-web/vite.config.js').as_uri())+';export default {...original,root:'+json.dumps(str(R/'campus-access-web'))+',server:{host:"127.0.0.1",port:15173,strictPort:true,proxy:{"/api":"http://127.0.0.1:19800"}}};',encoding='utf-8')
launch('react',['node',str(R/'campus-access-web/node_modules/vite/bin/vite.js'),'--config',str(vite)],cwd=R/'campus-access-web')
deadline=time.monotonic()+150;observations=[]
while time.monotonic()<deadline:
 layers={}
 for name,url in [('gateway','http://127.0.0.1:19800/api/roles'),('eureka1','http://127.0.0.1:19761/eureka/apps/USER-SERVICE'),('eureka2','http://127.0.0.1:19762/eureka/apps/USER-SERVICE'),('appointment','http://127.0.0.1:19821/internal/components')]:
  try:
   req=urllib.request.Request(url,headers={'Accept':'application/json',**({'X-Campus-Internal':cfg['internalKey']} if name=='appointment' else {})})
   with urllib.request.urlopen(req,timeout=2) as response:data=json.load(response)
   layers[name]=all(any(i['status']=='UP' and i['port']['$']==port for i in data['application']['instance']) for port in [19811,19813]) if name.startswith('eureka') else all(str(p) in data['servers'] for p in [19811,19813]) if name=='appointment' else data.get('success') is True
  except Exception:layers[name]=False
 observations.append(layers)
 (E/'startup-gate.json').write_text(json.dumps(observations,indent=2))
 if all(layers.values()):break
 time.sleep(.5)
print(json.dumps({'allLayersReady':all(layers.values()),'evidence':str(E.relative_to(R))}),flush=True)
if not all(layers.values()):raise SystemExit(1)
