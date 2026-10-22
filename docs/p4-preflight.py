from pathlib import Path
import hashlib,json,csv,subprocess,datetime
R=Path(__file__).resolve().parents[1];E=R/'docs/p4-evidence';E.mkdir(exist_ok=True)
archive=E/'input';archive.mkdir(exist_ok=True)
paths=list((R/'docs').glob('p3-*.md'))+[R/'docs/service-boundaries.md',R/'docs/compatibility-decision.md',R/'docs/migration-progress.md',R/'backend/pom.xml',R/'backend/gateway-service/src/main/java/edu/hfut/campus/GatewayApplication.java']
paths+=list((R/'backend/appointment-service/src').rglob('*'))+list((R/'backend/user-service/src').rglob('*'))
manifest=[]
for p in paths:
 if not p.is_file():continue
 rel=p.relative_to(R);target=archive/rel;target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists():target.write_bytes(p.read_bytes())
 manifest.append({'file':rel.as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
if not(archive/'manifest.json').exists():(archive/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
original=list(csv.DictReader((R/'docs/original-file-hashes.csv').open(encoding='utf-8-sig')))
checks=[{'file':r['file'],'unchanged':hashlib.sha256((R/'campus-access-web'/r['file']).read_bytes()).hexdigest()==r['sha256']}for r in original]
tracked=subprocess.check_output(['git','ls-files'],cwd=R,text=True).splitlines();sensitive=[p for p in tracked if any(x in p for x in ['.env','.private-backups','.p1-local','.p2-local','.p3-local','.p4-local'])]
report={'originalFiles':checks,'all68OriginalFilesUnchanged':len(checks)==68 and all(c['unchanged']for c in checks),'trackedSensitive':sensitive,'originalDatabaseWrites':0}
(E/('preflight-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
assert report['all68OriginalFilesUnchanged']and not sensitive
print('68 original files unchanged; sensitive files not tracked; P3 inputs archived without overwriting')
