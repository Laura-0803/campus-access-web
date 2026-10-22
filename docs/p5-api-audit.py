from pathlib import Path
import csv,json,re,collections
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p5-evidence';mappings=[]
for p in (R/'backend').glob('*/src/main/java/**/controller/*.java'):
 t=p.read_text(encoding='utf-8').replace('@GetMapping({"","/"})','@GetMapping');prefix=re.search(r'@RequestMapping\("([^"]+)"\)[^{]*class',t);base=prefix.group(1)if prefix else ''
 for m in re.finditer(r'@(Get|Post|Patch|Delete)Mapping(?:\("([^"]*)"\))?\s*public\s+[^\n{;]*?\s+(\w+)\(',t):
  url=base+(m.group(2)or'');mappings.append({'method':m.group(1).upper(),'path':url,'handler':p.stem+'.'+m.group(3),'file':p.relative_to(R).as_posix()})
rows=[];script_only={'API-'+str(n).zfill(3)for n in [4,6,15,18,25,27,33,35,45,46,47,51,52,59,63]};aggregates={'API-'+str(n).zfill(3)for n in [36,37,53,54]}
for x in csv.DictReader((D/'api-inventory.csv').open(encoding='utf-8-sig')):
 if x['id']=='API-009':state='未实现/禁用';handler='无Java方法，隔离Gateway返回404';module='未迁移';proof='p2-delete-detailed-design.md';front='原删除按钮存在但后端禁用'
 elif x['id']=='API-001' or x['id']in aggregates:state='Express过渡';handler='原server/index.js health'if x['id']=='API-001'else x['backend_source'];module='isolated Express';proof='p5-integration-test-evidence.md';front='无页面直接调用'if x['id']in ['API-001','API-054']else'已挂载页面调用Express聚合'
 else:
  concrete=re.sub(r':[A-Za-z]+','VALUE',x['path']);matches=[y for y in mappings if y['method']==x['method']and re.fullmatch(re.sub(r'\{[^}]+\}',r'[^/]+',y['path']),concrete)]
  assert matches,(x['id'],x['path']);y=matches[0];state='Java处理';handler=y['handler'];module=x['target_service'];proof={'user-service':'p2-api-migration.md','appointment-service':'p3-api-migration.md','access-service':'p4-api-migration.md','exception-service':'p4c-api-migration.md'}[module];front='仅脚本/内部客户端，当前无活动页面调用'if x['id']in script_only else'存在已挂载页面调用；不等于全部UI分支实测'
 diff=[]
 if x['id']in ['API-020','API-021']:diff.append('P2批准验证码不泄露/正常无通道503')
 if x['id']=='API-016':diff.append('P3批准停用被访人403')
 if x['id']=='API-017':diff.append('P4批准未知503/持久重放200；无绑定人员仍503未完成')
 if x['id']in ['API-004','API-035','API-063']:diff.append('P4安全核验；P4C批准非法时间拒绝')
 if x['id']in ['API-047','API-048']:diff.append('P4C批准受控状态/409/成功同键重放')
 rows.append({**x,'currentStatus':state,'currentHandler':handler,'currentService':module,'frontendState':front,'approvedDifferences':'；'.join(diff)or'无该接口专属新增差异；共用安全边界见阶段契约','evidence':proof})
counts=dict(collections.Counter(x['currentStatus']for x in rows));assert len(rows)==68 and counts=={'Express过渡':5,'Java处理':62,'未实现/禁用':1},counts
(E/'api-audit.json').write_text(json.dumps({'counts':counts,'javaCoverage':62/68,'activeJavaPageCallCandidates':sum(x['currentStatus']=='Java处理'and x['id']not in script_only for x in rows),'javaMappings':mappings,'rows':rows},ensure_ascii=False,indent=2),encoding='utf-8')
table='|ID|Method / 原URL|当前处理者|页面/API区别|差异及证据|\n|---|---|---|---|---|\n'
for x in rows:table+=f"|{x['id']}|{x['method']} {x['path']}|{x['currentService']}：{x['currentHandler']}|{x['frontendState']}|{x['approvedDifferences']}；[{x['evidence']}]({x['evidence']})|\n"
(D/'p5-final-api-inventory.md').write_text('''# 原68条API最终状态核对

统计键为P0清单的HTTP Method＋原路径模式，分母68固定不变，不能把内部接口或新增撤码计入分子。62/68=91.18%由Java处理；Express5/68=7.35%（四聚合加health）；人员删除1/68=1.47%未实现。排除health后业务Java覆盖62/67=92.54%。这不是总体功能/页面/课程评分完成率；最终审批无绑定分支和真实短信送达仍未完成。

Controller注解静态核对及逐项机器清单见[p5-evidence/api-audit.json](p5-evidence/api-audit.json)。47条Java API在当前挂载组件存在调用路径，15条无活动页面直接调用；47只是静态可达候选，不是47项UI测试通过。详细原参数/字段/状态见[原契约](api-contract.md)。P5未修改这些契约。

'''+table,encoding='utf-8');print(json.dumps({'counts':counts,'javaMappingsFound':len(mappings),'activeJavaPageCallCandidates':47}))
