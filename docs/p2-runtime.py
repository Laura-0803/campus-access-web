"""Manage only P2-owned loopback processes; no system Java settings are changed."""
from pathlib import Path
import os,json,subprocess,sys,time,socket,urllib.request,ctypes
from ctypes import wintypes
def process_handle(pid):
 k=ctypes.WinDLL('kernel32',use_last_error=True);k.OpenProcess.restype=wintypes.HANDLE
 h=k.OpenProcess(0x1001,False,pid)
 return k,h
def created(pid,terminate=False,expected=None):
 k,h=process_handle(pid)
 if not h:return None
 try:
  times=[wintypes.FILETIME() for _ in range(4)]
  if not k.GetProcessTimes(h,*[ctypes.byref(t) for t in times]):return None
  stamp=(times[0].dwHighDateTime<<32)+times[0].dwLowDateTime
  if terminate and stamp==expected:k.TerminateProcess(h,0)
  return stamp
 finally:k.CloseHandle(h)
R=Path(__file__).resolve().parents[1];L=R/'.p2-local';config=json.loads((L/'runtime.json').read_text(encoding='utf-8-sig'));state=L/'processes.json'
if sys.argv[1] in ['stop','halt']:
 if state.exists():
  remaining=[]
  for p in json.loads(state.read_text()):
   if sys.argv[1]=='stop' or p['name']==sys.argv[2]:created(p['pid'],True,p['created'])
   else:remaining.append(p)
  if remaining:state.write_text(json.dumps(remaining))
  else:state.unlink()
 print('Stopped owned P2 processes');raise SystemExit
restart=sys.argv[1]=='restart'
if state.exists() and not restart:raise SystemExit('Process state already exists; stop owned processes first')
for port in ([] if restart else [19761,19762,19800,19811,19812,19830,15173]):
 with socket.socket() as s:
  if s.connect_ex(('127.0.0.1',port))==0:raise SystemExit('Port occupied: '+str(port))
jdk=json.loads((R/'.p1-local/jdk.json').read_text(encoding='utf-8-sig'))['javaHome']
env={**os.environ,'P2_WORKSPACE':str(R),'P2_DB_URL':f"jdbc:mysql://127.0.0.1:{config['port']}/{config['database']}?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=UTF-8",'P2_DB_USER':config['username'],'P2_DB_PASSWORD':config['password'],'P2_INTERNAL_KEY':config['internalKey'],'P2_ADAPTER_KEY':config['adapterKey'],'P2_DEMO':'true','P2_DEMO_PHONES':','.join(config['allowedPhones']),'SPRING_PROFILES_ACTIVE':'synthetic-demo'}
env.pop('DEBUG',None)
E=R/'docs/p2-evidence'/('runtime-'+time.strftime('%Y%m%dT%H%M%S'));E.mkdir();owned=json.loads(state.read_text()) if restart and state.exists() else []
def launch(name,cmd,extra={}):
 if cmd[0]==java:cmd+=['--debug=false','--logging.level.root=INFO','--logging.level.org.springframework.web=INFO','--logging.level.org.springframework.http=INFO']
 log=(E/(name+'.log')).open('wb');p=subprocess.Popen(cmd,cwd=R/'campus-access-web' if name=='react' else R,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 owned.append({'name':name,'pid':p.pid,'created':created(p.pid)});state.write_text(json.dumps(owned));return p
java=str(Path(jdk)/'bin/java.exe')
def jar(module):return str(R/'backend'/module/'target'/(module+'-0.2.0-SNAPSHOT.jar'))
if restart:
 name=sys.argv[2]
 if name not in ['adapter','user'] or any(p['name']==name for p in owned):raise SystemExit('Halt owned component before restart')
 launch(name,['node',str(R/'backend/legacy-adapter/server.mjs')] if name=='adapter' else [java,'-Xmx256m','-jar',jar('user-service')]);print('Restarted owned component:',name);raise SystemExit
for name,port,host,peer in [('registry1',19761,'localhost','127.0.0.1:19762'),('registry2',19762,'127.0.0.1','localhost:19761')]:launch(name,[java,'-Xmx192m','-jar',jar('eureka-server'),'--server.port='+str(port)],{'REGISTRY_HOST':host,'PEER_URL':'http://'+peer+'/eureka/'})
launch('user',[java,'-Xmx256m','-jar',jar('user-service')]);launch('normal-user',[java,'-Xmx192m','-jar',jar('user-service'),'--server.port=19812','--eureka.client.register-with-eureka=false'],{'P2_DEMO':'false','SPRING_PROFILES_ACTIVE':'normal'})
launch('adapter',['node',str(R/'backend/legacy-adapter/server.mjs')]);launch('gateway',[java,'-Xmx192m','-jar',jar('gateway-service')])
viteconfig=L/'vite.config.mjs'
viteconfig.write_text('import original from '+json.dumps((R/'campus-access-web/vite.config.js').as_uri())+';export default {...original,root:'+json.dumps(str(R/'campus-access-web'))+',server:{host:"127.0.0.1",port:15173,strictPort:true,proxy:{"/api":"http://127.0.0.1:19800"}}};',encoding='utf-8')
launch('react',['node',str(R/'campus-access-web/node_modules/vite/bin/vite.js'),'--config',str(viteconfig)])
ready=False
for _ in range(120):
 try:
  with urllib.request.urlopen('http://127.0.0.1:19800/api/roles',timeout=2) as r:
   body=json.load(r)
   if body.get('success') and len(body['data']['roles'])==6:ready=True;break
 except Exception:pass
 time.sleep(1)
(E/'startup.json').write_text(json.dumps({'ready':ready,'processes':owned},indent=2));print('Gateway readiness:',ready,'evidence:',E.relative_to(R))
if not ready:raise SystemExit(1)
