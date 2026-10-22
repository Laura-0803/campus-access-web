"""Create private recovery archive and verify P0 inventories without changing application."""
from pathlib import Path
import csv, json, hashlib, zipfile, re
BASE=Path(__file__).resolve().parent.parent
APP=BASE/'campus-access-web'; DOC=BASE/'docs'
def out(name,obj): (DOC/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
live=json.loads((DOC/'database-live-summary.json').read_text(encoding='utf8'))['database']
private=Path(live['backup']['path']).parent
archive=private/'original-project.zip'
files=sorted(p for p in APP.rglob('*') if p.is_file() and not any(x in p.relative_to(APP).parts for x in ['node_modules','dist','.idea','.git']) and not p.name.endswith('.log'))
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in files: z.write(p,p.relative_to(BASE).as_posix())
 z.write(BASE/'Codex改造实施说明.md','Codex改造实施说明.md')
with zipfile.ZipFile(archive) as z: corrupt=z.testzip()
out('backup-manifest.json',{'sourceArchive':str(archive),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'applicationFiles':len(files),'zipIntegrity':'pass' if corrupt is None else 'fail','containsSensitiveData':True,'restoreTest':'not-run','databaseBackup':live['backup'],'warning':'Local temporary directory only; preserve elsewhere before migration. Never commit these backups.'})
# Inspect backup data in memory; publish only counts and schema, no personal rows.
snapshot=json.loads(Path(live['backup']['path']).read_text(encoding='utf8'))
tables={t['table']:t for t in snapshot['tables']}
quality={}
for t,key in [('users','username'),('people','code'),('vehicles','plate_no'),('qr_codes','appointment_id')]:
 counts={}
 for row in tables[t]['rows']:
  v=row.get(key)
  if v is not None and v!='': counts[v]=counts.get(v,0)+1
 quality[t+'.'+key]={'duplicateGroups':sum(n>1 for n in counts.values()),'extraRows':sum(n-1 for n in counts.values() if n>1)}
people={r['id'] for r in tables['people']['rows']};users={r['id'] for r in tables['users']['rows']};appts={r['id'] for r in tables['appointments']['rows']}
quality['orphanReferences']={}
for t,key,parent in [('users','person_id',people),('sessions','user_id',users),('faces','person_id',people),('vehicles','owner_id',people),('appointments','visitor_id',people),('appointments','host_id',people),('access_records','person_id',people),('qr_codes','owner_id',people),('qr_codes','visitor_id',people),('qr_codes','appointment_id',appts)]:
 quality['orphanReferences'][t+'.'+key]=sum(r.get(key) is not None and r.get(key) not in parent for r in tables[t]['rows'])
quality['appointmentStatuses']={}
for r in tables['appointments']['rows']:
 status=r.get('status'); quality['appointmentStatuses'][status]=quality['appointmentStatuses'].get(status,0)+1
quality['passwordFormats']={'pbkdf2':sum(str(r['password']).startswith('pbkdf2$') for r in tables['users']['rows']),'other':sum(not str(r['password']).startswith('pbkdf2$') for r in tables['users']['rows'])}
quality['scope']='Snapshot aggregates only; not business correctness, password strength or API tests.'
out('database-quality-summary.json',quality)
fields=list(csv.DictReader((DOC/'database-fields.csv').open(encoding='utf-8-sig')))
expected={(r['table'],r['column']) for r in fields}
livecols={(c['TABLE_NAME'],c['COLUMN_NAME']) for c in live['columns']}
routes=list(csv.DictReader((DOC/'api-inventory.csv').open(encoding='utf-8-sig')))
baseline=list(csv.DictReader((DOC/'source-inventory.csv').open(encoding='utf-8-sig')))
changed=[r['file'] for r in baseline if hashlib.sha256((APP/r['file']).read_bytes()).hexdigest()!=r['sha256']]
checks={'routes':len(routes),'uniqueRoutes':len({(r['method'],r['path']) for r in routes}),'frontendMethods':len({a for r in routes for a in r['frontend_method'].split(';') if a!='无前端封装'}),'designTables':len({r['table'] for r in fields}),'designColumns':len(fields),'actualTables':len(live['tables']),'actualColumns':len(livecols),'missingColumns':sorted(expected-livecols),'extraColumns':sorted(livecols-expected),'unchangedSourceFiles':len(baseline)-len(changed),'changedSourceFiles':changed,'roles':sorted(r['role'] for r in live['roles']),'allRowsUnmigrated':all(r['migration']=='未迁移' for r in routes),'backupZipIntegrity':corrupt is None}
assert checks['routes']==checks['uniqueRoutes']==68
assert checks['frontendMethods']==62 and checks['designTables']==18 and not changed
assert len(checks['roles'])==6 and not checks['missingColumns']
out('p0-verification.json',checks)
# Response construction keys for complex aggregate branches, without copying source values.
lines=['# 聚合/分析响应字段索引','', '这是完整源文件对象键的辅助索引，按构造函数分段；包含内部变量键，不等同于所有字段必然出现在响应。已在api-contract.md定义稳定业务DTO，动态分支待HTTP黄金样例验证。','']
for name in ['server/routes/dashboard.js','server/routes/reports.js','server/lib/exceptionAgent.js']:
 s=(APP/name).read_text(encoding='utf8'); lines+=['## '+name,'']
 starts=list(re.finditer(r'^(?:export )?function (\w+)\(',s,re.M))
 for i,m in enumerate(starts):
  block=s[m.start():starts[i+1].start() if i+1<len(starts) else len(s)]
  keys=sorted(set(re.findall(r'^\s*(\w+)\s*:',block,re.M)))
  if keys: lines+=['- `'+m[1]+'`（L'+str(s[:m.start()].count('\n')+1)+'）：'+', '.join(keys)]
 routekeys=sorted(set(re.findall(r'^\s*(\w+)\s*:',s,re.M)))
 lines+=['','文件中全部显式对象键：'+', '.join(routekeys),'']
(DOC/'api-response-fields.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
# Include all original files, including lockfile/config/data/assets, as hashes only.
with (DOC/'original-file-hashes.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['file','bytes','sha256'])
 for p in files: w.writerow([p.relative_to(APP).as_posix(),p.stat().st_size,hashlib.sha256(p.read_bytes()).hexdigest()])
print(json.dumps({'verification':checks,'quality':quality,'backupFiles':len(files)},ensure_ascii=False))
