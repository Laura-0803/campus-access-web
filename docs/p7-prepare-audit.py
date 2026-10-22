"""P7-A evidence-only preparation; no business sources, schemas or fixtures changed."""
from pathlib import Path
import json,hashlib,re,datetime
R=Path(__file__).resolve().parents[1]; E=R/'docs/p7-evidence'; E.mkdir(exist_ok=True)
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
files=[]
for root in ['backend','campus-access-web/src','campus-access-web/server']:
 for p in (R/root).rglob('*'):
  if p.is_file() and not any(x in p.parts for x in ['target','node_modules','dist']) and p.suffix in ['.java','.xml','.properties','.sql','.jsx','.js','.json','.css','.mjs']:
   files.append({'file':p.relative_to(R).as_posix(),'sha256':digest(p)})
for name in ['campus-access-web/package.json','campus-access-web/package-lock.json','campus-access-web/vite.config.js','.gitignore']:
 p=R/name
 if p.exists(): files.append({'file':name,'sha256':digest(p)})
baseline=E/'source-baseline.json'
if not baseline.exists():baseline.write_text(json.dumps(files,indent=2),encoding='utf-8')
versions=[];sql=[]
for p in (R/'backend').rglob('*'):
 if not p.is_file() or 'target' in p.parts:continue
 if p.name in ['pom.xml','application.properties']:
  versions.append({'file':p.relative_to(R).as_posix(),'sha256':digest(p),'lines':[l for l in p.read_text(encoding='utf-8').splitlines() if any(t in l.lower() for t in ['version','ribbon','hystrix','eureka','server.address','server.port','feign','timezone'])]})
 if p.suffix=='.sql':
  text=p.read_text(encoding='utf-8');sql.append({'file':p.relative_to(R).as_posix(),'sha256':digest(p),'tables':re.findall(r'CREATE TABLE(?: IF NOT EXISTS)?\s+`?(\w+)',text,re.I),'executedByP7':False})
(E/'static-engineering.json').write_text(json.dumps({'sourceFiles':len(files),'versionsAndRuntimeConfig':versions,'sqlMigrations':sql,'businessSourceEditsByP7':0},indent=2),encoding='utf-8')
# Derive separate evidence destinations; preserve every original P6 test and report.
s=(R/'docs/p6-runtime.py').read_text(encoding='utf-8').replace('docs/p6-evidence','docs/p7-evidence')
(R/'docs/p7-runtime.py').write_text(s,encoding='utf-8')
s=(R/'docs/p6-http.mjs').read_text(encoding='utf-8').replace('docs/p6-evidence','docs/p7-evidence').replace('docs/p6-runtime.py','docs/p7-runtime.py')
(R/'docs/p7-http.mjs').write_text(s,encoding='utf-8')
names=['ready','browser-flow','browser-abf','regression-access-test','regression-security-test','regression-incident-test','regression-config-test','persistence','report-visual']
for name in names:
 s=(R/f'docs/p6-{name}.mjs').read_text(encoding='utf-8').replace('docs/p6-evidence','docs/p7-evidence').replace('./p5-http.mjs','./p7-http.mjs').replace('./p6-http.mjs','./p7-http.mjs').replace('docs/p6-runtime.py','docs/p7-runtime.py')
 (R/f'docs/p7-{name}.mjs').write_text(s,encoding='utf-8')
s=(R/'docs/p6-secret-audit.mjs').read_text(encoding='utf-8').replace('docs/p6-evidence','docs/p7-evidence').replace("startsWith('p6-')","startsWith('p7-')").replace('./p5-http.mjs','./p7-http.mjs')
(R/'docs/p7-secret-audit.mjs').write_text(s,encoding='utf-8')
print(json.dumps({'sourceBaselineFiles':len(files),'sqlFiles':len(sql),'newEvidenceDirectory':str(E.relative_to(R))}))
