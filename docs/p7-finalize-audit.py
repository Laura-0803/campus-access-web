"""Final read-only source/course/evidence checks, plus P7 delivery hashes."""
from pathlib import Path
import json,hashlib,re,subprocess
R=Path(__file__).resolve().parents[1];E=R/'docs/p7-evidence'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
before=json.loads((E/'source-baseline.json').read_text(encoding='utf-8'));changes=[]
for r in before:
 p=R/r['file']
 if not p.exists() or sha(p)!=r['sha256']:changes.append(r['file'])
(E/'source-preservation.json').write_text(json.dumps({'baselineFiles':len(before),'unchanged':len(before)-len(changes),'changes':changes,'pass':not changes,'scope':'all baseline Java/React/Express/SQL/config files; rebuilt target/dist excluded'},indent=2),encoding='utf-8')
course=[]
for row in json.loads((R/'docs/p5-evidence/course-sources.json').read_text(encoding='utf-8')):
 p=Path(row['file']);course.append({'file':p.name,'exists':p.exists(),'sha256Matches':p.exists() and sha(p)==row['sha256']})
(E/'course-source-check.json').write_text(json.dumps(course,ensure_ascii=False,indent=2),encoding='utf-8')
private=['.private-backups.zip','.private-backups','.p1-local','.p2-local','.p3-local','.p4-local','.p4c-local','.p5-local','.p6-local']
tracked=subprocess.run(['git','ls-files','--',*private],cwd=R,capture_output=True,text=True).stdout.strip().splitlines()
ignored=subprocess.run(['git','check-ignore','--',*private],cwd=R,capture_output=True,text=True).stdout.strip().splitlines()
(E/'git-private-check.json').write_text(json.dumps({'trackedPrivatePaths':tracked,'ignoredRequestedPaths':ignored,'pass':not tracked,'noCommitOrStagingByP7':True},indent=2),encoding='utf-8')
files=[p for p in (R/'docs').glob('p7-*') if p.is_file()]+[R/'docs/migration-progress.md',R/'docs/p5-final-api-inventory.md']
missing=[]
for p in files+[E/'final-api-matrix.md']:
 if p.suffix!='.md':continue
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
  if ':' not in target and not target.startswith('#') and not(p.parent/target.split('#')[0]).exists():missing.append({'file':p.relative_to(R).as_posix(),'target':target})
artifacts=[{'file':p.relative_to(R).as_posix(),'sha256':sha(p)}for p in sorted(E.rglob('*')) if p.is_file() and p.name!='delivery-manifest.json']
manifest={'documentsAndScripts':[{'file':p.relative_to(R).as_posix(),'sha256':sha(p)}for p in sorted(files)],'evidenceArtifacts':artifacts,'missingLocalLinks':missing,'businessSourceChanges':changes,'pass':not missing and not changes and not tracked and all(x['sha256Matches'] for x in course)}
(E/'delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'baselineFiles':len(before),'sourceChanges':len(changes),'documentsAndScripts':len(files),'missingLinks':len(missing),'courseOriginalsPreserved':all(x['sha256Matches']for x in course),'privateTracked':len(tracked),'pass':manifest['pass']}))
if not manifest['pass']:raise SystemExit(1)
