"""Prepare only local integration orchestration. No schema reset, seeds or business edits."""
from pathlib import Path
import json,hashlib,csv,subprocess,datetime
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p5-evidence';E.mkdir(exist_ok=True);L=R/'.p5-local';L.mkdir(exist_ok=True)
manifest=[]
for base in ['backend','campus-access-web/src']:
 for p in (R/base).rglob('*'):
  if not p.is_file() or any(x in p.parts for x in ['target','node_modules']):continue
  manifest.append({'file':p.relative_to(R).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
if not(E/'source-baseline.json').exists():(E/'source-baseline.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
inputs=[]
for p in sorted(D.glob('*.md')):
 if p.name.startswith('p5-'):continue
 if any(s in p.name for s in ['acceptance','contract','evidence','boundar','progress','delete','design','frontend','permission','database']):
  raw=p.read_bytes();inputs.append({'file':p.relative_to(R).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
(E/'read-inputs.json').write_text(json.dumps(inputs,indent=2),encoding='utf-8')
if not(L/'runtime.json').exists():(L/'runtime.json').write_bytes((R/'.p4c-local/runtime.json').read_bytes())
if __import__('os').name=='nt':
 subprocess.run(['powershell','-NoProfile','-Command',"$ErrorActionPreference='Stop'; $section=[System.Security.AccessControl.AccessControlSections]::Access; $source=Get-Acl -LiteralPath '.p4c-local'; $target=New-Object System.Security.AccessControl.DirectorySecurity; $target.SetSecurityDescriptorSddlForm($source.GetSecurityDescriptorSddlForm($section),$section); (Get-Item -LiteralPath '.p5-local').SetAccessControl($target); $source=Get-Acl -LiteralPath '.p4c-local/runtime.json'; $target=New-Object System.Security.AccessControl.FileSecurity; $target.SetSecurityDescriptorSddlForm($source.GetSecurityDescriptorSddlForm($section),$section); (Get-Item -LiteralPath '.p5-local/runtime.json').SetAccessControl($target)"],cwd=R,check=True,stdout=subprocess.DEVNULL)
if not(L/'bridge-launcher.mjs').exists():(L/'bridge-launcher.mjs').write_text((R/'backend/p4c-legacy-adapter/server.mjs').read_text(encoding='utf-8').replace('.p4c-local','.p5-local'),encoding='utf-8')
p=D/'p5-runtime-internal.py'
if not p.exists():
 t=(D/'p4c-runtime.py').read_text(encoding='utf-8').replace('.p4c-local','.p5-local').replace('docs/p4c-evidence','docs/p5-evidence').replace('backend/p4c-legacy-adapter/server.mjs','.p5-local/bridge-launcher.mjs');t=t.replace("'P4_FAULT_INJECTION':'true'","'P4_FAULT_INJECTION':os.environ.get('P5_FAULT_TEST','false')").replace("'P4C_FAULT_INJECTION':'true'","'P4C_FAULT_INJECTION':os.environ.get('P5_FAULT_TEST','false')");p.write_text(t,encoding='utf-8')
for source,target in [('p4c-http.mjs','p5-http.mjs'),('p4c-ready.mjs','p5-ready.mjs')]:
 p=D/target
 if not p.exists():p.write_text((D/source).read_text(encoding='utf-8').replace('.p4c-local','.p5-local').replace('docs/p4c-evidence','docs/p5-evidence').replace('docs/p4c-runtime.py','docs/p5-runtime-internal.py').replace('./p4c-http.mjs','./p5-http.mjs'),encoding='utf-8')
p=R/'.gitignore';t=p.read_text(encoding='utf-8');p.write_text(t+('\n.p5-local/\n'if '.p5-local/' not in t else ''),encoding='utf-8')
print('P5 local orchestration prepared; existing synthetic schemas reused, no initialization or reset')
