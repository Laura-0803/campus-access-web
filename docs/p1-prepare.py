"""Verify/copy P0 backups without overwriting; restore source into a private temp dir."""
from pathlib import Path
import json, hashlib, shutil, zipfile, tempfile, csv, datetime
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'docs/backup-manifest.json').read_text(encoding='utf8'))
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
destination=root/'.private-backups'/('p0-preserved-'+stamp)
destination.mkdir(parents=True,exist_ok=False)
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
copies=[]
for source,expected in [(Path(manifest['sourceArchive']),manifest['sha256']),(Path(manifest['databaseBackup']['path']),manifest['databaseBackup']['sha256'])]:
 assert source.is_file(), 'P0 backup is missing'
 assert digest(source)==expected, 'P0 checksum mismatch'
 target=destination/source.name
 with source.open('rb') as a,target.open('xb') as b: shutil.copyfileobj(a,b)
 assert digest(target)==expected
 copies.append({'name':source.name,'sha256':expected,'originalUnchanged':digest(source)==expected})
restore=Path(tempfile.mkdtemp(prefix='campus-p1-source-restore-')).resolve()
with zipfile.ZipFile(destination/'original-project.zip') as z:
 assert z.testzip() is None
 for item in z.infolist():
  assert (restore/item.filename).resolve().is_relative_to(restore),'Unsafe archive member'
 z.extractall(restore)
baseline=list(csv.DictReader((root/'docs/original-file-hashes.csv').open(encoding='utf-8-sig')))
checks=[]
for row in baseline:
 restored=restore/'campus-access-web'/row['file']
 assert restored.is_file() and digest(restored)==row['sha256'], 'Restored file mismatch: '+row['file']
 assert digest(root/'campus-access-web'/row['file'])==row['sha256'], 'Original file changed since P0: '+row['file']
 checks.append(row['file'])
local=root/'.p1-local'; local.mkdir(exist_ok=True)
(local/'backup-location.json').write_text(json.dumps({'directory':str(destination),'sourceRestore':str(restore)},indent=2),encoding='utf8')
result={'copiedTo':str(destination),'sourceRestoredTo':str(restore),'originalP0BackupsNotOverwritten':True,'files':copies,'restoredApplicationFilesVerified':len(checks),'currentApplicationFilesMatchP0':len(checks),'sourceRestore':'pass','databaseRestore':'pending','sensitivePayloadsOutsideGit':True}
(root/'docs/p1-backup-restore.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'sourceRestore':'pass','filesVerified':len(checks),'copiesVerified':len(copies)}))
