from pathlib import Path
import json,csv,hashlib,subprocess,datetime
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p5-evidence';hash=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
baseline=json.loads((E/'source-baseline.json').read_text());assert all(hash(R/x['file'])==x['sha256']for x in baseline)
original=list(csv.DictReader((D/'original-file-hashes.csv').open(encoding='utf-8-sig')));assert len(original)==68 and all(hash(R/'campus-access-web'/x['file'])==x['sha256']for x in original)
for x in json.loads((E/'course-sources.json').read_text(encoding='utf-8')):assert hash(Path(x['file']))==x['sha256']
tracked=subprocess.check_output(['git','ls-files'],cwd=R,text=True).splitlines();sensitive=[p for p in tracked if '.private-backups' in p or '-local/' in p or '.env' in p];assert not sensitive
files=[p for p in D.glob('p5-*')if p.is_file()and p.suffix in ['.py','.mjs','.md']]+[R/'.gitignore',D/'README.md',D/'migration-progress.md',D/'service-boundaries.md']
with(D/'p5-change-files.csv').open('w',encoding='utf-8-sig',newline='')as f:
 w=csv.DictWriter(f,fieldnames=['file','change','bytes','sha256']);w.writeheader()
 for p in sorted(set(files)):w.writerow({'file':p.relative_to(R).as_posix(),'change':'new'if p.name.startswith('p5-')else'modified','bytes':p.stat().st_size,'sha256':hash(p)})
(E/'delivery-checks.json').write_text(json.dumps({'businessSourceFilesUnchanged':len(baseline),'original68Unchanged':True,'courseDocxOriginalsUnchanged':True,'sensitiveTracked':sensitive,'gitCommitCreated':False},indent=2),encoding='utf-8')
entries=[]
for p in sorted(set(files)|{D/'p5-change-files.csv'}|{p for p in E.rglob('*')if p.is_file()and p.name!='final-manifest.json'}):entries.append({'file':p.relative_to(R).as_posix(),'bytes':p.stat().st_size,'sha256':hash(p)})
(E/'final-manifest.json').write_text(json.dumps({'createdAt':datetime.datetime.now().isoformat(),'algorithm':'SHA-256','selfExcluded':True,'files':entries},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'deliveredFiles':len(set(files)),'manifestEntries':len(entries),'businessSourcesUnchanged':len(baseline),'originalSourcesUnchanged':68}))
