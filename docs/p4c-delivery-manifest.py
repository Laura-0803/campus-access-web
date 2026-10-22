from pathlib import Path
import csv,json,hashlib,datetime,subprocess
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p4c-evidence';baseline={x['file']:x['sha256']for x in json.loads((E/'input/manifest.json').read_text(encoding='utf-8'))}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
files=[]
for base in ['backend','docs']:
 for p in (R/base).rglob('*'):
  if not p.is_file()or any(x in p.parts for x in ['target','node_modules'])or base=='docs'and ('-evidence' in str(p.parent)or p.name=='p4c-change-files.csv'):continue
  rel=p.relative_to(R).as_posix()
  if baseline.get(rel)!=digest(p):files.append(p)
files.append(R/'.gitignore')
with(D/'p4c-change-files.csv').open('w',encoding='utf-8-sig',newline='')as f:
 w=csv.DictWriter(f,fieldnames=['file','change','bytes','sha256']);w.writeheader()
 for p in sorted(set(files)):
  rel=p.relative_to(R).as_posix();w.writerow({'file':rel,'change':'modified'if rel in baseline or rel=='.gitignore'else'new','bytes':p.stat().st_size,'sha256':digest(p)})
checks=[]
for x in csv.DictReader((D/'p2-implementation-files.csv').open(encoding='utf-8-sig')):
 if x['file'].startswith('backend/user-service/src/'):
  p=R/x['file'];checks.append({'file':x['file'],'unchanged':digest(p)==x['sha256']})
assert len(checks)==55 and all(x['unchanged']for x in checks)
tracked=subprocess.check_output(['git','ls-files'],cwd=R,text=True).splitlines();assert not any('.private-backups' in x or '-local/' in x or '.env' in x for x in tracked)
(E/'p2-preservation-final.json').write_text(json.dumps({'checked':55,'allUnchanged':True,'sensitiveTracked':False,'checks':checks},indent=2),encoding='utf-8')
entries=[]
for p in sorted(set(files)|{D/'p4c-change-files.csv'}|{p for p in E.rglob('*')if p.is_file()and p.name!='final-manifest.json'}):entries.append({'file':p.relative_to(R).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
(E/'final-manifest.json').write_text(json.dumps({'createdAt':datetime.datetime.now().isoformat(),'algorithm':'SHA-256','selfExcluded':True,'files':entries},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'changedFiles':len(set(files)),'manifestEntries':len(entries),'p2SourcesUnchanged':55}))
