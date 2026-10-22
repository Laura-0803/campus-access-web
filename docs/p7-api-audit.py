"""Reconcile original 68 API rows with actual controllers/services and mounted React consumers."""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[1];E=R/'docs/p7-evidence'
j=json.loads((R/'docs/p6-evidence/api-audit.json').read_text(encoding='utf-8')); rows=[]
app=(R/'campus-access-web/src/App.jsx').read_text(encoding='utf-8')
routes={}
for line in app.splitlines():
 m=re.search(r'<Route path="([^"]+)"',line)
 if m:
  for component in re.findall(r'<(\w+(?:Page|Dashboard))\b',line):routes.setdefault(component,[]).append(m[1])
routes['LoginPage']=['/login'];routes['VisitorDashboard']=['/visitor']
services={'RecordsController':'AccessOperations','QrController':'AccessOperations','ConfigurationController':'AccessOperations','HealthController':'AggregationService','DashboardController':'AggregationService','ReportController':'AggregationService','AppointmentController':'AppointmentQueries / AppointmentCommands / FinalApprovalService','AuthController':'AuthService','ProfileController':'ProfileService','PersonQueryController':'ProfileService','PersonAdminController':'AdminService','UserAdminController':'AdminService','RoleController':'AuthService','FaceController':'CredentialService','VehicleController':'CredentialService','MessageController':'MessageService','AuditController':'MessageService','ExceptionController':'IncidentService','BlacklistController':'IncidentService'}
domain_dependencies={'user-service':'UserMapper / DomainMapper; users, people, roles, role_profiles, sessions, verification_codes, faces, vehicles, messages, logs; visitor writes -> exception-service blacklist','appointment-service':'AppointmentMapper / IssuanceMapper / OutboxMapper; appointments + decisions/issuance/outbox; user-service, exception-service, access-service','access-service':'AccessMapper / IssuanceMapper / EventMapper; qr_codes/access_records/gates/devices/access_rules/settings + issuance/outbox; user/appointment/exception','exception-service':'IncidentMapper; exceptions/blacklist + inbox/operations/outbox; user-service identity/audit','aggregation-service':'no DataSource/DAO; Feign user/appointment/access/exception; health also Gateway'}
phase={'user-service':'p2-test-evidence.md','appointment-service':'p3-test-evidence.md + p4-qr-consistency-test.md','access-service':'p4-test-evidence.md','exception-service':'p4c-test-evidence.md','aggregation-service':'p6-test-evidence.md'}
def method_body(text,name):
 m=re.search(r'public\s+[^{};]+?\b'+re.escape(name)+r'\s*\(',text)
 if not m:return ''
 start=text.find('{',m.end());depth=1;i=start+1
 while i<len(text) and depth:
  depth+=(text[i]=='{')-(text[i]=='}');i+=1
 return text[start:i]
specific={
 'PersonQueryController':'people, users; UserMapper/DomainMapper',
 'PersonAdminController':'people/users/roles/role_profiles/logs; user Mapper; visitor blacklist -> exception-service',
 'UserAdminController':'users/people/roles/sessions/logs; user Mapper',
 'RoleController':'roles/role_profiles; user Mapper',
 'ProfileController':'people/users/role_profiles/logs; user Mapper',
 'AuthController':'users/people/roles/sessions/verification_codes/logs; user Mapper; registration -> exception-service',
 'FaceController':'faces/people/users/logs; DomainMapper',
 'VehicleController':'vehicles/people/users/logs; DomainMapper',
 'MessageController':'messages/logs; DomainMapper + realtime identity',
 'AuditController':'logs; DomainMapper + realtime identity',
 'RecordsController':'access_records/access_requests/access_outbox + qr_codes/rules/gates/devices/settings; user/appointment/exception validation',
 'QrController':'qr_codes/qr_issuance; user/appointment identity/authorization; audit/events by operation',
 'ConfigurationController':'devices/gates/access_rules/settings; validation additionally qr/person/appointment/blacklist',
 'ExceptionController':'exceptions/incident_requests/incident_outbox; user identity/audit; analysis uses local event metadata',
 'BlacklistController':'blacklist/incident_locks/incident_outbox; user identity/audit',
 'HealthController':'five probes: Gateway + four domain real SQL projections; no own database',
 'DashboardController':'Feign user/appointment/access/exception projections; no own database',
 'ReportController':'Feign user authentication + appointment/access/exception projections; no own database'}
browser_reports=[]
for p in sorted(E.glob('browser-*/report.json')):
 d=json.loads(p.read_text(encoding='utf-8'));browser_reports.append((p,d))
mounts={}
for p in (R/'campus-access-web/src').rglob('*.jsx'):
 text=p.read_text(encoding='utf-8');functions=list(re.finditer(r'export\s+(?:default\s+)?function\s+(\w+)\s*\(',text))
 for m in re.finditer(r'api\.(\w+)\s*\(',text):
  prior=[x for x in functions if x.start()<m.start()];fn=prior[-1][1] if prior else p.stem
  if fn in routes:mounts.setdefault(m[1],set()).update(routes[fn])
for row in j['rows']:
 r=dict(row);handler=r['currentHandler'];service=r['currentService'];n=int(r['id'].split('-')[1])
 r['historicalEvidence']=phase.get(service,'p2-delete-detailed-design.md')
 if n==9:
  r.update(controllerFile=None,controllerMethodVerified=False,serviceLayer='disabled; no Java delete endpoint',dependencies='none; Gateway methods exclude DELETE people',reactRoutes='no enabled delete operation',p7Coverage='disabled route negative check only',uncovered='entire deletion Saga; not authorized')
 else:
  klass,method=handler.split('.');candidates=list((R/'backend'/service).rglob(klass+'.java'));assert len(candidates)==1,(n,handler)
  p=candidates[0];text=p.read_text(encoding='utf-8');assert re.search(r'\b'+method+r'\s*\(',text),(n,handler)
  names=[x.strip() for x in re.split(r'[;,]',r.get('frontend_method',''))]
  ast_file=E/'frontend-static.json'
  if ast_file.exists():
   ast_mounts=json.loads(ast_file.read_text(encoding='utf-8'))['apiMountedRoutes'];actual=sorted(set().union(*(set(ast_mounts.get(x,[])) for x in names)))
  else:actual=sorted(set().union(*(mounts.get(x,set()) for x in names)))
  # Explicitly mounted shared widgets and login helper flows, verified from source.
  if n in [19,20,21,22,23]:actual=['/login']
  if n==24:actual=['AppShell logout (all authenticated routes)']
  if n==1:actual=[]
  if n in [49,50]:actual=['/profile']
  if n in [51,52]:actual=[]
  r.update(controllerFile=p.relative_to(R).as_posix(),controllerMethodVerified=True,serviceLayer=services[klass],dependencies=domain_dependencies[service],reactRoutes=', '.join(actual) if actual else 'no confirmed mounted direct consumer; API/script only',p7Coverage='see exact request/assertion index in p7-test-evidence; not all branches rerun',uncovered='all unlisted parameters, error combinations, performance and mobile paths remain untested in P7')
  calls=sorted(set(re.findall(r'\b(s|service|commands|finals)\.(\w+)\s*\(',method_body(text,method))))
  names={'s':services[klass],'service':'AppointmentQueries','commands':'AppointmentCommands','finals':'FinalApprovalService'}
  r['serviceLayer']='; '.join(names[a]+'.'+b for a,b in calls) or services[klass]
  r['dependencies']=specific.get(klass,domain_dependencies[service])
  if klass=='AppointmentController':r['dependencies']={'list':'appointments; AppointmentMapper; user-service current identity and scope','hosts':'user-service directory Feign; no cross-domain SQL','one':'appointments; AppointmentMapper + user-service scoped identity','create':'appointments/appointment_outbox; user-service host/person checks; exception-service blacklist','review':'appointments/appointment_review_history/appointment_issuance/appointment_outbox; user-service realtime authority; access-service issuance'}[method]
  pat='^'+re.sub(r':[A-Za-z_]+',r'[^/]+',r['path'])+'$'
  matches=[]
  for bp,br in browser_reports:
   events=[x for x in br.get('http',[]) if x.get('method')==r['method'] and re.match(pat,x.get('path','').split('?')[0])]
   if events:matches.append({'report':bp.relative_to(R).as_posix(),'observedRequests':len(events),'statuses':sorted(set(x['status'] for x in events))})
  r['p7BrowserObservedHttp']=matches
  r['p7Coverage']='; '.join(x['report'].replace('docs/','')+' HTTP '+str(x['observedRequests'])+' statuses '+str(x['statuses']) for x in matches) if matches else 'P7 browser did not record this route; historical evidence only unless separate HTTP assertion names cover it'
  if n==17:r['uncovered']='unbound person -> protected503; unknown issuance -> approved503/recovery; manual HOLD unsupported; no global transaction'
  if n in [20,21,22]:r['uncovered']='real SMS delivery not tested; synthetic-demo only, normal unconfigured503'
  if n==12:r['uncovered']='last administrator/self-disable backend constraints not implemented or changed'
  if n==63:r['uncovered']='unknown appointment page fault branch not marked passed; HTTP coverage and malformed time safety separately recorded'
 r['approvedDifferences']=r.get('approvedDifferences','')
 if n in [20,21]:r['approvedDifferences']='P2 approved SMS scheme A: no live code in normal HTTP, missing provider503; synthetic demo exception'
 if n==16:r['approvedDifferences']='P3 approved inactive host403, original error wrapper'
 if n==17:r['approvedDifferences']='P4-B bound success200 appointment+real qrCode; unknown503 persistent recovery; duplicate confirmed replay; unbound503'
 if n in [47,48]:r['approvedDifferences']='P4-C approved controlled one-way states, terminal409, optional idempotent replay/conflict409'
 if n==63:r['approvedDifferences']='P4-C approved malformed restrictive time -> safe denial'
 rows.append(r)
assert len(rows)==68 and sum(x['controllerMethodVerified'] for x in rows)==67
(E/'final-api-matrix.json').write_text(json.dumps({'totalOriginalApis':68,'javaHandlers':67,'disabled':1,'expressHandlers':0,'rows':rows,'sourceVerified':True,'uiVerificationIsNotInferredFromBackendImplementation':True},ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# P7 最终68条API功能验收矩阵','','2026-10-21。67条Java处理，1条人员删除禁用。表中“历史证据”指已保存运行材料；P7重跑范围以测试报告为准，不将源码匹配当作真实运行。Controller方法均逐项核实，/profiles/me复用/{role}。依赖列按域列出完整依赖上限，具体SQL调用见Controller→Service→Mapper，不表示每个方法读写全部表。','','|ID / Method / URL|Java Controller（源文件）|Service|数据库或跨服务依赖|React当前入口（静态核查）|已运行证据 / 本轮|未覆盖及契约差异|','|---|---|---|---|---|---|---|---|']
for r in rows:
 src=f"[{r['currentHandler']}](../../{r['controllerFile']})" if r['controllerFile'] else '禁用；无Java删除方法'
 vals=[r['id']+' '+r['method']+' '+r['path'],src,r['serviceLayer'],r['dependencies'],r['reactRoutes'],r['historicalEvidence']+'；'+r['p7Coverage']+'；[P7实测索引](../p7-test-evidence.md)',r['uncovered']+'；'+r['approvedDifferences']]
 lines.append('|'+ '|'.join(v.replace('|','/') for v in vals)+'|')
(E/'final-api-matrix.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'originalApis':68,'javaControllerMethodsVerified':67,'disabled':1,'express':0}))
