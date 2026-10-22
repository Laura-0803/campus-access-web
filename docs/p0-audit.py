"""P0 read-only source inventory. Writes reports only in docs; never imports application."""
from pathlib import Path
import re, csv, hashlib, json, subprocess
ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'campus-access-web'
DOC = ROOT / 'docs'
def write(name, text): (DOC/name).write_text(text, encoding='utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
files = sorted(p for p in APP.rglob('*') if p.is_file() and not any(x in p.relative_to(APP).parts for x in ['node_modules','dist','.idea','.git']) and p.suffix in ['.js','.jsx','.css','.html','.sql','.json'] and p.name not in ['package-lock.json','db.json'])
sources = {p.relative_to(APP).as_posix():p.read_text(encoding='utf-8-sig') for p in files}
with (DOC/'source-inventory.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f); w.writerow(['file','lines','sha256','imports','exports','api_methods'])
 for name,s in sources.items():
  w.writerow([name,len(s.splitlines()),digest(APP/name),'; '.join(re.findall(r'from\s+["\']([^"\']+)',s)),'; '.join(re.findall(r'export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class)\s+(\w+)',s)),'; '.join(sorted(set(re.findall(r'api\.(\w+)',s))))])
roles=['student','teacher','visitor','alumni','guard','admin']
def allowed(method,path):
 if path in ['/health','/roles','/auth/login','/auth/send-code','/auth/reset-code','/auth/reset-password','/auth/register-visitor']: return '公开'
 if path.startswith('/auth/'): return ';'.join(roles)
 if path.startswith('/messages'): return 'admin' if (method in ['POST','DELETE'] or path=='/messages/:id') else ';'.join(roles)
 if path.startswith('/profiles/me') or path=='/dashboard/:role': return ';'.join(roles)
 if path.startswith('/appointments'): return {'POST':'visitor;admin','PATCH':'student;teacher;admin'}.get(method,'student;teacher;visitor;admin')
 if path.startswith('/exceptions'):
  return 'admin' if path=='/exceptions/chat' else 'guard' if method in ['POST','PATCH'] else 'guard;admin'
 if path.startswith('/devices'): return 'guard;admin' if method=='GET' else 'admin'
 if path.startswith('/access-records'): return 'guard;admin'
 if path.startswith('/faces'): return 'student;teacher;admin'
 if path.startswith('/vehicles'): return 'teacher;admin'
 if path.startswith('/qr-codes'): return 'visitor;alumni;admin' if method=='POST' and path=='/qr-codes' else 'visitor;alumni;guard;admin'
 return 'admin'
def owner(path):
 if path.startswith('/appointments'): return 'appointment-service'
 if path.startswith(('/exceptions','/blacklist')): return 'exception-service'
 if path.startswith(('/qr-codes','/access-records','/devices','/gates','/access-rules')): return 'access-service'
 if path.startswith('/reports'): return 'user-service(聚合API)'
 if path=='/health': return 'gateway-service'
 return 'user-service'
client=sources['src/api/client.js']
methods=[]
for line in client.splitlines():
 m=re.search(r'^\s*(\w+):.*?request\((["`])(.+?)\2',line)
 if m:
  path=m[3].split('?')[0]; path=re.sub(r'\$\{(?:id|role)\}',lambda x: ':'+x[0][2:-1],path); path=path.replace('${query}',''); path=path.split('${')[0]
  verb=re.search(r'method:\s*"(\w+)"',line)
  methods.append((m[1],verb[1] if verb else 'GET',path,line.strip()))
calls={name:[] for name,_,_,_ in methods}
for name,s in sources.items():
 if not name.startswith('src/') or name=='src/api/client.js': continue
 for i,line in enumerate(s.splitlines(),1):
  for m in re.finditer(r'\bapi\.(\w+)\b',line): calls.setdefault(m[1],[]).append(f'{name}:{i}')
rows=[]
for name in ['server/index.js']+sorted(n for n in sources if n.startswith('server/routes/')):
 s=sources[name]; matches=list(re.finditer(r'\b(?:router|api)\.(get|post|patch|delete|put)\("([^"]+)"',s))
 for i,m in enumerate(matches):
  block=s[m.start():matches[i+1].start() if i+1<len(matches) else len(s)]
  verb=m[1].upper(); path=m[2]; front=[a for a,v,p,_ in methods if v==verb and p==path]
  # Include shared helper inputs separately; route-local extraction is deliberately labelled.
  query=sorted(set(re.findall(r'(?:req\.)?query\??\.(\w+)',block)))
  if verb=='GET' and path=='/appointments': query=['status','host','visitor','hostId','visitorId','visitorPhone']
  if verb=='GET' and path=='/access-records': query=['status','type','gate','method','name','keyword','timeFrom','timeTo','limit']
  if path.startswith('/profiles/'): query=['userId']
  if path in ['/faces','/vehicles']: query=['userId','personId','role'] if verb=='GET' else query
  body=sorted(set(re.findall(r'(?:req\.)?body\??\.(\w+)',block)))
  for pattern in [r'const\s*\{([^}]+)\}\s*=\s*req\.body',r'requireFields\(req\.body,\s*\[([^]]+)\]']:
   for fields in re.findall(pattern,block): body+=re.findall(r'["\'](\w+)["\']',fields) if '"' in fields else re.findall(r'(?:^|,)\s*(\w+)',fields)
  for array in re.findall(r'(?:const\s+(?:required|editable)\s*=|for\s*\(const key of)\s*\[([^]]+)\]',block,re.S): body+=re.findall(r'"(\w+)"',array)
  if path=='/appointments' and verb=='POST': body+=['visitor','visitorPhone','host','reason','visitStart']
  if path.startswith('/people') and verb in ['POST','PATCH']: body+=['name','type','role','code','idNumber','phone','college','className','department','position','host','company','graduationYear','major','gate','status']
  statuses=sorted(set(re.findall(r'fail\(res,\s*(\d+)',block)))
  response=' | '.join(re.findall(r'(?:ok|created)\(res,\s*([^\n]+)',block))
  test_id=f'CONTRACT-{len(rows)+1:03}'
  rows.append([f'API-{len(rows)+1:03}',verb,'/api'+path,f'{name}:{s[:m.start()].count(chr(10))+1}',';'.join(front) or '无前端封装',';'.join(c for a in front for c in calls[a]) or '无直接消费点',';'.join(query),';'.join(sorted(set(body))),response,'201' if 'created(res,' in block else '200',';'.join(statuses+['401(受保护)','403(鉴权)','500(全局)']),allowed(verb,path),owner(path),'未迁移','P0静态核对；动态契约待P2-P6',test_id,'api-contract.md（按方法/路径查完整字段与DTO）'])
with (DOC/'api-inventory.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['id','method','path','backend_source','frontend_method','frontend_consumers','query_local','body_local','response_expression','success_status','error_status','effective_roles','target_service','migration','test_status','planned_test_id','full_contract']);w.writerows(rows)
write('frontend-api-map.md','# 前端 API 对照\n\n路径相对于应用目录。全部封装逐项对应 api-inventory.csv；未消费不代表允许删除。\n\n|封装|方法|路径模板|调用点|\n|---|---|---|---|\n'+'\n'.join(f'|{a}|{v}|`{p}`|'+('<br>'.join(calls[a]) or '未发现调用')+'|' for a,v,p,_ in methods)+'\n\n## 页面路由\n\n```jsx\n'+'\n'.join(l.strip() for l in sources['src/App.jsx'].splitlines() if '<Route ' in l)+'\n```\n')
schema=sources['server/db/schema.sql']; tables=re.findall(r'CREATE TABLE IF NOT EXISTS (\w+) \((.*?)\) ENGINE',schema,re.S)
groups={'user-service':['roles','role_profiles','users','people','vehicles','faces','sessions','messages','logs'],'appointment-service':['appointments'],'access-service':['access_records','devices','qr_codes','settings','gates','access_rules'],'exception-service':['exceptions','blacklist']}
table_owner={t:g for g,ts in groups.items() for t in ts}
dictionary='# 数据字典与数据归属\n\n这是 schema.sql 的设计基线，实际库差异见 database-live-summary.json。NULL/默认值/键均保留原定义；无显式 NOT NULL 的列允许 NULL。所有表 InnoDB / utf8mb4_unicode_ci。\n'
fieldrows=[]
for table,body in tables:
 dictionary+=f'\n## {table} → {table_owner[table]}\n\n|字段|类型与约束|JSON 建议映射|\n|---|---|---|\n'
 for line in body.strip().splitlines():
  col,definition=line.strip().rstrip(',').split(' ',1)
  camel=re.sub(r'_([a-z])',lambda m:m[1].upper(),col)
  camel={'role_key':'role(字典键)','role_value':'role','read_flag':'read','slot_key':'slot'}.get(col,camel)
  dictionary+=f'|{col}|{definition}|{camel}|\n';fieldrows.append([table,col,definition,camel,table_owner[table]])
dictionary+='\n## 外键原定义\n\n```sql\n'+schema[schema.index('ALTER TABLE users'):]+ '\n```\n\n逻辑关系：roles→users/people 为一对多但未建 FK；people→users/faces/vehicles 为一对多，people→appointments 通过 visitor_id/host_id 两种关系关联；appointments→qr_codes 一对多（数据库没有 appointment_id 唯一约束）。角色与校门/通行方式为多对多，目前以 access_rules 的 TEXT 列表达，若以后正规化须增量建立关联表并保持数组/文本接口兼容。\n'
write('database-dictionary.md',dictionary)
with (DOC/'database-fields.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['table','column','definition','json_mapping_candidate','owner']);w.writerows(fieldrows)
summary={'source_files':len(files),'routes':len(rows),'frontend_wrappers':len(methods),'tables':len(tables),'columns':len(fieldrows),'unmatched_wrappers':[a for a,v,p,_ in methods if not any(r[1]==v and r[2]=='/api'+p for r in rows)]}
write('static-summary.json',json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
