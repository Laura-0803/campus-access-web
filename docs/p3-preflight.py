"""P3 read-only baseline. Never loads original store/init scripts."""
from pathlib import Path
import json,csv,hashlib,subprocess,time
R=Path(__file__).resolve().parents[1];E=R/'docs/p3-evidence';E.mkdir(exist_ok=True)
baseline=E/'input';baseline.mkdir(exist_ok=True)
for file in ['backend/pom.xml','backend/gateway-service/src/main/java/edu/hfut/campus/GatewayApplication.java','docs/compatibility-decision.md','docs/service-boundaries.md','docs/migration-progress.md','docs/p2-implementation-files.csv']:
 target=baseline/file;target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists():target.write_bytes((R/file).read_bytes())
original=list(csv.DictReader((R/'docs/original-file-hashes.csv').open(encoding='utf-8-sig')))
checks=[{'file':x['file'],'unchanged':hashlib.sha256((R/'campus-access-web'/x['file']).read_bytes()).hexdigest()==x['sha256']} for x in original]
rows=list(csv.DictReader((baseline/'docs/p2-implementation-files.csv').open(encoding='utf-8-sig')))
protected=[x for x in rows if x['file'].startswith(('backend/user-service/','experiments/')) or x['file'].startswith('docs/p2')]
changes=[x['file'] for x in protected if not(R/x['file']).is_file() or hashlib.sha256((R/x['file']).read_bytes()).hexdigest()!=x['sha256']]
tracked=subprocess.check_output(['git','ls-files'],cwd=R,text=True).splitlines()
sensitive=[p for p in tracked if any(q in p for q in ['.private-backups','.p1-local','.p2-local','.p3-local','.env','database-snapshot'])]
ignore=subprocess.run(['git','check-ignore','--','.p3-local/runtime.json','.private-backups.zip','.p2-local/runtime.json'],cwd=R,capture_output=True,text=True)
report={'originalFiles':checks,'all68OriginalFilesUnchanged':len(checks)==68 and all(x['unchanged'] for x in checks),'p2ProtectedExistingFilesChanged':changes,'trackedSensitive':sensitive,'p3PrivateIgnored':ignore.returncode==0,'originalDatabaseWritesByThisScript':0}
(E/('preflight-'+time.strftime('%Y%m%dT%H%M%S')+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='originalFiles'}))
if changes or sensitive or ignore.returncode or not report['all68OriginalFilesUnchanged']:raise SystemExit(1)
