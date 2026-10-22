"""Read-only source/backup hashes and delivery manifest. Never captures private file contents."""
from pathlib import Path
import json,hashlib,zipfile,re,subprocess
R=Path(__file__).resolve().parents[1];E=R/'docs/p6-evidence'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
before=json.loads((E/'source-baseline.json').read_text(encoding='utf-8'));existing=[]
for x in before:
 p=R/x['file'];h=digest(p)
 if h!=x['sha256']:existing.append({'file':x['file'],'beforeSha256':x['sha256'],'afterSha256':h})
new=[{'file':p.relative_to(R).as_posix(),'sha256':digest(p)} for p in (R/'backend/aggregation-service').rglob('*') if p.is_file() and 'target' not in p.parts]
allowed={'backend/pom.xml','backend/gateway-service/src/main/java/edu/hfut/campus/GatewayApplication.java','backend/user-service/src/main/java/edu/hfut/campus/client/LegacyClient.java'}
report={'baselineFiles':len(before),'unchanged':len(before)-len(existing),'existingChanges':existing,'newAggregationFiles':new,'scopePass':{x['file'] for x in existing}==allowed,'reactUnchanged':not any(x['file'].startswith('campus-access-web/src/') for x in existing),'originalExpressUnchanged':not any(x['file'].startswith('campus-access-web/server/') for x in existing),'additionalInfrastructureChange':'.gitignore adds .p6-local/ only in P6','gitHistoryNotRecoveredOrInvented':True}
(E/'source-change-manifest.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
jars=[{'file':p.relative_to(R).as_posix(),'sha256':digest(p)} for p in (R/'backend').glob('*/target/*-SNAPSHOT.jar')];(E/'built-jars.json').write_text(json.dumps(jars,indent=2),encoding='utf-8')
p0=json.loads((R/'docs/backup-manifest.json').read_text(encoding='utf-8'));z=zipfile.ZipFile(p0['sourceArchive']);diff=[];unchanged=0
for name in z.namelist():
 if name.endswith('/'):continue
 p=R/name
 if p.exists() and hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256(z.read(name)).digest():unchanged+=1
 else:diff.append(name)
(E/'original-source-preservation.json').write_text(json.dumps({'archiveNonDirectoryMembers':unchanged+len(diff),'unchanged':unchanged,'changedSinceP0':diff,'expectedApprovedP5FrontendFour':len(diff)==4 and all(x.startswith('campus-access-web/src/') for x in diff),'p6BaselineConfirmsThoseFrontendFilesUnchanged':report['reactUnchanged'],'allOriginalExpressUnchanged':all('/server/' not in x for x in diff)},indent=2),encoding='utf-8')
missing=[];documents=[]
for p in sorted((R/'docs').glob('p6-*')):
 if p.is_file():documents.append({'file':p.relative_to(R).as_posix(),'sha256':digest(p)})
for name in ['docs/p5-final-api-inventory.md','docs/p5-course-rubric-matrix.md','docs/service-boundaries.md','docs/migration-progress.md']:
 p=R/name;documents.append({'file':name,'sha256':digest(p)})
for x in documents:
 p=R/x['file']
 if p.suffix=='.md':
  for link in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
   if ':' not in link and not link.startswith('#') and not (p.parent/link.split('#')[0]).exists():missing.append({'file':x['file'],'link':link})
(E/'delivery-manifest.json').write_text(json.dumps({'documentsAndScripts':documents,'missingLocalLinks':missing,'originalSourceArchiveSha256':digest(Path(p0['sourceArchive'])),'privateFilesNotIncluded':True},indent=2),encoding='utf-8')
print(json.dumps({'sourceScopePass':report['scopePass'],'newAggregationFiles':len(new),'missingLocalLinks':len(missing),'jarCount':len(jars)}))
if not report['scopePass'] or missing:raise SystemExit(1)
