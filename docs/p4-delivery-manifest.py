from pathlib import Path
import csv,json,hashlib,subprocess,datetime
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p4-evidence'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
baseline={r['file']:r['sha256'] for r in json.loads((E/'input/manifest.json').read_text(encoding='utf-8'))}
files=set([R/'.gitignore',R/'backend/pom.xml'])
for module in ['access-service','p4-legacy-adapter']:
 files.update(p for p in (R/'backend'/module).rglob('*') if p.is_file() and 'target' not in p.parts)
for folder in ['backend/user-service/src','backend/appointment-service/src','backend/gateway-service/src']:
 for p in (R/folder).rglob('*'):
  if p.is_file() and baseline.get(p.relative_to(R).as_posix())!=digest(p):files.add(p)
for p in D.glob('p4-*'):
 if p.is_file():files.add(p)
for name in ['service-boundaries.md','compatibility-decision.md','migration-progress.md','p3-current-state.md','p3-appointment-service-design.md','p3-state-machine.md','p3-database-migration.md','p3-service-calls.md']:files.add(D/name)
with (D/'p4-change-files.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=['file','change','bytes','sha256']);w.writeheader()
 for p in sorted(files):
  rel=p.relative_to(R).as_posix();w.writerow({'file':rel,'change':'modified' if rel in baseline or rel=='.gitignore' else 'new-or-P4-support','bytes':p.stat().st_size,'sha256':digest(p)})
# P2 business sources are compared against their reviewed implementation list; no P2 public source edits allowed.
checks=[]
for row in csv.DictReader((D/'p2-implementation-files.csv').open(encoding='utf-8-sig')):
 rel=row['file']
 if rel.startswith('backend/user-service/src/'):
  p=R/rel;checks.append({'file':rel,'unchanged':p.exists() and digest(p)==row['sha256']})
assert checks and all(c['unchanged'] for c in checks)
tracked=subprocess.check_output(['git','ls-files'],cwd=R,text=True).splitlines()
private=['.private-backups.zip','.private-backups/','.p1-local/','.p2-local/','.p3-local/','.p4-local/','.env']
assert not any(any(x in p for x in private) for p in tracked)
(E/'p2-source-preservation-final.json').write_text(json.dumps({'checkedP2UserSources':len(checks),'allUnchanged':True,'files':checks,'trackedSensitiveFiles':[]},indent=2),encoding='utf-8')
manifest=[]
for p in sorted(E.rglob('*')):
 if p.is_file() and p.name!='final-manifest.json':manifest.append({'file':p.relative_to(R).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
for p in sorted(files|{D/'p4-change-files.csv'}):manifest.append({'file':p.relative_to(R).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
(E/'final-manifest.json').write_text(json.dumps({'createdAt':datetime.datetime.now().isoformat(),'algorithm':'SHA-256','selfExcluded':True,'files':manifest},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'changedOrNewFiles':len(files),'manifestEntries':len(manifest),'unchangedP2UserSources':len(checks)}))
