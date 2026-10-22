"""Derive a separate process owner from reviewed P5 launcher, without copying secrets."""
from pathlib import Path
p=Path('docs/p5-runtime-internal.py');s=p.read_text(encoding='utf-8')
s=s.replace("L=R/'.p5-local';cfg=json.loads((L/'runtime.json')", "L=R/'.p6-local';L.mkdir(exist_ok=True);cfg=json.loads((R/'.p5-local/runtime.json')")
s=s.replace("R/'docs/p5-evidence'", "R/'docs/p6-evidence'")
s=s.replace('19853,15173]', '19853,19861,15173]')
s=s.replace("env.pop('DEBUG',None)","env['P6_MODE']=os.environ.get('P6_ROUTE','false');env.pop('DEBUG',None)")
s=s.replace("owned=json.loads(state.read_text())", "import re\nif cfg['host']!='127.0.0.1' or any(not re.fullmatch(pattern,cfg[name]) for name,pattern in [('database',r'campus_p2_user_[0-9]{14}'),('appointmentDatabase',r'campus_p3_appointment_[0-9]{14}'),('accessDatabase',r'campus_p4_access_[0-9]{14}'),('exceptionDatabase',r'campus_p4c_exception_[0-9]{14}')]):raise SystemExit('P6 requires four existing isolated synthetic schemas')\nowned=json.loads(state.read_text())")
s=s.replace("log=(E/(name+'.log')).open('wb');p=subprocess.Popen(command,cwd=cwd,env={**env,**(extra or {})},", "child_env={**env,**(extra or {})}\n if name=='aggregation':child_env={k:v for k,v in child_env.items() if not any(t in k.upper() for t in ['PASSWORD','MYSQL','_DB_','TOKEN','SECRET']) and not k.startswith(('P2_','P3_','P4_','P4C_'))};child_env['P2_INTERNAL_KEY']=cfg['internalKey']\n log=(E/(name+'.log')).open('wb');p=subprocess.Popen(command,cwd=cwd,env=child_env,")
s=s.replace("elif name=='adapter':", "elif name=='aggregation':launch(name,[java,'-Xmx256m','-jar',jar('aggregation-service')])\n elif name=='gateway':launch(name,[java,'-Xmx192m','-jar',jar('gateway-service')])\n elif name=='adapter':")
s=s.replace("launch('gateway',[java", "launch('aggregation',[java,'-Xmx256m','-jar',jar('aggregation-service')])\nlaunch('gateway',[java",1) if False else s
# Insert only before the non-indented startup call, not the restart branch.
s=s.replace("\nlaunch('gateway',[java", "\nlaunch('aggregation',[java,'-Xmx256m','-jar',jar('aggregation-service')])\nlaunch('gateway',[java")
s=s.replace("\nlaunch('adapter',['node',str(R/'.p5-local/bridge-launcher.mjs')])", "\nif env['P6_MODE']!='true':launch('adapter',['node',str(R/'.p5-local/bridge-launcher.mjs')])")
s=s.replace("['node',str(R/'.p5-local/bridge-launcher.mjs')]", "['node',str(R/'.p5-local/bridge-launcher.mjs')]")
s=s.replace("server:{host:", "preview:{host:")
s=s.replace("'--config',str(vite)", "'preview','--config',str(vite)")
Path('docs/p6-runtime.py').write_text(s,encoding='utf-8')
