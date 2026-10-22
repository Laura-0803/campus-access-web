from pathlib import Path
import json,hashlib,csv,subprocess,datetime
R=Path(__file__).resolve().parents[1];E=R/'docs/p4c-evidence';A=E/'input';A.mkdir(parents=True,exist_ok=True)
rows=[]
for base in ['backend','docs']:
 for p in (R/base).rglob('*'):
  if not p.is_file() or any(x in p.parts for x in ['target','node_modules','p4c-evidence']) or (base=='docs' and ('-evidence' in str(p.parent) or p.name.startswith('p4c-'))):continue
  rel=p.relative_to(R);q=A/rel;q.parent.mkdir(parents=True,exist_ok=True)
  if not q.exists():q.write_bytes(p.read_bytes())
  rows.append({'file':rel.as_posix(),'sha256':hashlib.sha256(q.read_bytes()).hexdigest()})
if not(A/'manifest.json').exists():(A/'manifest.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
orig=list(csv.DictReader((R/'docs/original-file-hashes.csv').open(encoding='utf-8-sig')));assert len(orig)==68 and all(hashlib.sha256((R/'campus-access-web'/x['file']).read_bytes()).hexdigest()==x['sha256'] for x in orig)
tracked=subprocess.check_output(['git','ls-files'],cwd=R,text=True).splitlines();assert not any('.private-backups' in x or '-local/' in x or '.env' in x for x in tracked)
(E/('preflight-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'.json')).write_text(json.dumps({'original68Unchanged':True,'sensitiveTracked':False,'baselineFiles':len(rows)},indent=2),encoding='utf-8');print('P4-C baseline archived; original 68 unchanged; sensitive files untracked')
