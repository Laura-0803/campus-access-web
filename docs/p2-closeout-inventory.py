"""Read-only final API/Mapper audit; extend documentation, never generate business code."""
from pathlib import Path
import re,json,csv,hashlib
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p2-evidence'
archive=E/'closeout-input';archive.mkdir(exist_ok=True)
for name in ['p2-api-migration.md','p2-acceptance.md','p2-test-evidence.md','p2-security-test.md','migration-progress.md','p2-implementation-files.csv']:
 target=archive/name
 if not target.exists():target.write_bytes((D/name).read_bytes())
prior=list(csv.DictReader((archive/'p2-implementation-files.csv').open(encoding='utf-8-sig')))
unchanged=[x['file'] for x in prior if x['file'].startswith('backend/') and hashlib.sha256((R/x['file']).read_bytes()).hexdigest()!=x['sha256']]
if unchanged:raise SystemExit('Approved backend files changed: '+repr(unchanged))
# IDs below refer to XML statement ids, not fabricated SQL traces.
data={
'005':('type?,keyword? → Person[]+顶层total','U.searchPeople','管理员','batch2','隔离通过；真实库未切换'),
'006':('path id → Person；缺失404','U.person','管理员','batch2','隔离通过'),
'007':('Person必填/按类型扩展字段 → Person/201','U.people;D.createPerson','管理员；访客需远程黑名单通过','batch3','隔离通过；跨域黑名单故障安全拒绝'),
'008':('path id+人员白名单字段 → Person/200','U.lockPerson,people;D.updatePerson','管理员','batch3','隔离通过'),
'009':('path id → 原Person/200；原同步级联语义','无','管理员（设计）','none','未实现/未编译/未运行；等待删除方案审批'),
'010':('role? → SafeUser[]+total','D.users','管理员','batch3','隔离通过'),
'011':('username,password,role,personId,accountType?/id?/status? → SafeUser/201','U.person,account,insertUser','管理员','batch3','隔离通过；原people页面分两次HTTP创建，不保证跨HTTP事务'),
'012':('path id+username?/password?/role?/personId?/accountType?/status? → SafeUser','U.lockUser,account,person;D.updateUser','管理员','batch3','隔离通过；账号停用与人员状态不是同一字段'),
'018':('无 → roles/roleProfiles字典','U.roles,profiles','公开','batch1','隔离通过'),
'019':('account或username,password → Session','U.account,lockUser,insertSession,audit,person,profiles','公开入口；校验账号密码及启用状态','batch1','六角色真实浏览器登录通过'),
'020':('phone → phone/expireMinutes；演示显式code','U.code,saveCode','公开；隔离白名单及限流','batch1','正常无短信503；真实短信送达未测试'),
'021':('account,phone → phone/expireMinutes；演示显式code','U.account,person,code,saveCode','公开；绑定号码匹配、隔离白名单、限流','batch1','正常无短信503；真实短信送达未测试'),
'022':('account,phone,code,newPassword,confirmPassword → SafeUser','U.code,codeAttempt,account,person,password,deleteUserSessions,deleteCode,audit','有效一次性码及账号绑定；撤销全部会话','batch1','合成环境通过；真实短信端到端未测试'),
'023':('name,phone,idNumber,code,password,confirmPassword,company? → registered/phone/user/person/201','U.code,codeAttempt,account,insertPerson,insertUser,audit,deleteCode','公开；黑名单通过后注册visitor，角色不可参数提权','batch1','合成环境通过；真实短信端到端未测试'),
'024':('当前Token → loggedOut','U.deleteSession','六角色有效会话','batch1','浏览器退出后Java/Express均401'),
'025':('userId?/account?仅管理员代查 → Session','U.user,account,person,profiles','本人；管理员可指定目标','batch1','隔离通过，Token仍为当前会话Token'),
'026':('oldPassword,newPassword,userId? → SafeUser','U.lockUser,password,audit','本人；管理员指定目标仍校验原密码','batch1','普通改密保留其他会话，沿用旧契约'),
'027':('userId?/personId?/role? → Face[]+total','U.user,person,profiles;D.faces','学生/教职工本人，管理员代查','batch3','隔离通过；无人员关联404'),
'028':('管理员定位字段?+fileName?/imageUrl?/slot?/label? → Face/201','U.lockPerson;D.faces,insertFace,updateFace,updatePerson','学生/教职工本人，管理员代办','batch3','隔离通过；最多2槽位、人员状态同事务'),
'029':('userId?/personId?/role? → Vehicle[]+total','U.user,person,profiles;D.vehicles','教职工本人，管理员代查','batch3','隔离通过；无人员关联404'),
'030':('plateNo,ownerId(管理员必填),status?/lastAccess? → Vehicle/201','U.lockPerson;D.vehicles,vehicleCount,insertVehicle','教职工归属强制本人；管理员可指定','batch3','隔离通过；唯一车牌/每人2辆并发限制'),
'031':('path id+plateNo?/ownerId?(管理员)/status?/lastAccess? → Vehicle','U.lockPerson;D.vehicle,vehicles,vehicleCount,updateVehicle','本人车主或管理员','batch3','实际原代码允许lastAccess，与P0静态注释不同'),
'032':('path id → 被删Vehicle','D.vehicle,deleteVehicle','本人车主或管理员','batch3','隔离通过；非人员跨域删除'),
'049':('userId? → ProfileEnvelope','U.user,person,profiles','六角色本人；管理员须指定目标','batch2','隔离通过；原页面会传当前userId'),
'050':('userId?(管理员),phone?,company?(visitor) → ProfileEnvelope','U.user,lockPerson,updateContact,profiles','六角色本人；禁止参数提权','batch2','六角色浏览器保存及回读通过'),
'051':('path role,userId? → ProfileEnvelope','U.user,users,person,profiles','管理员','batch2','隔离通过'),
'052':('path role,userId?,phone?,status? → ProfileEnvelope','U.user,users,lockPerson,updateContact,profiles','管理员','batch2','隔离通过'),
'055':('role?(管理员),read? → Message含targetRoles[]+total','D.messages','六角色按受众；过滤旧预约通知','batch3','隔离通过；read_flag原本共享'),
'056':('title,content,targetRoles或targetRole? → Message/201','D.insertMessage','管理员','batch3','隔离通过'),
'057':('path id+title?/content?/targetRoles?/targetRole? → Message','D.message,updateMessage','管理员','batch3','隔离通过'),
'058':('path id → 被删Message原对象','D.message,deleteMessage','管理员','batch3','隔离通过；不强补targetRoles'),
'059':('path id+read?默认true → Message原对象','D.message,updateMessage','可见受众；不可跨受众操作','batch3','隔离通过；保留共享read语义'),
'068':('role?,actor? → Log[]+total','D.logs','管理员','batch3','隔离通过；日志不含完整凭证'),
}
text=(archive/'p2-api-migration.md').read_text(encoding='utf-8-sig')
base={}
for line in text.splitlines():
 if line.startswith('|API-'):
  cells=line.strip('|').split('|');base[cells[0][4:7]]=cells
assert len(base)==len(data)==33
statement_ids={}
for prefix,filename in [('U','UserMapper.xml'),('D','DomainMapper.xml')]:
 statement_ids[prefix]=set(re.findall(r'\bid="([^"]+)"',(R/'backend/user-service/src/main/resources/mapper'/filename).read_text()))
proof=[];rows=[]
suite_files={'batch1':'batch1-1792403129907.json','batch2':'batch2-1792403133519.json','batch3':'batch3-1792403135217.json'}
for key,(contract,sql,permission,suite,gap) in data.items():
 cells=base[key];method=cells[2];controller=None
 if key!='009':
  cls,fun=method.split('.');source=R/'backend/user-service/src/main/java/edu/hfut/campus/controller'/(cls+'.java')
  assert re.search(r'\b'+fun+r'\s*\(',source.read_text()),method
  controller=str(source.relative_to(R)).replace('\\','/')
 if sql!='无':
  for group in sql.split(';'):
   prefix,ids=group.split('.')
   assert set(ids.split(','))<=statement_ids[prefix],sql
 evidence='未运行' if suite=='none' else '[真实HTTP/SQL断言](p2-evidence/'+suite_files[suite]+')'
 proof.append({'api':'API-'+key,'controllerMethod':method,'controllerSource':controller,'xmlStatementIdsVerified':sql!='无','implemented':key!='009','compiledPreviously':key!='009','actuallyRunPreviously':key!='009','deleteSagaRun':False if key=='009' else None})
 rows.append('|API-'+key+'|'+cells[1]+' / '+method+'|'+contract+'|'+sql+'|'+permission+'|'+evidence+'|'+gap+'|')
section='''

## P2收尾逐项复核（2026-10-19）

本表与上方33条逐项对应，U=UserMapper.xml，D=DomainMapper.xml。XML语句ID与实际Controller方法经只读脚本核验；真实运行依据链接中的HTTP/SQL断言，不把静态核验冒充SQL执行追踪。所有需登录的接口均经SessionAuthority查询session及当前user状态/角色；普通人不得由客户端角色头决定身份。字段类型展开、原错误包装及空值/省略规则见[原契约](api-contract.md)和原Express源码；未迁移原68条契约没有整体重写。

成功默认200，标注201的保留201；列表顶层total，客户端分页、原排序保留；失败保留success:false/error.message及可选details。未实施人员删除不属于“32条通过”。真实短信4条的合成测试不表示真实通道送达通过。

|API|Method/路径及Java方法|原请求 → 成功data契约|真实Mapper语句（另含公共鉴权）|服务端权限|运行证据|最终未完成/边界|
|---|---|---|---|---|---|---|
'''+ '\n'.join(rows)+'''

32条实现/编译/运行与原隔离测试状态不变；人员删除无Controller方法、无Mapper、无运行证据，详细设计[待审批](p2-delete-detailed-design.md)。4个dashboard/reports跨域聚合仍在隔离Express，不计入这33条的Java完成数量。本轮浏览器结果及页面级剩余问题见[p2-browser-regression.md](p2-browser-regression.md)。
'''
current=(D/'p2-api-migration.md').read_text(encoding='utf-8-sig')
current=current.split('\n## P2收尾逐项复核')[0]
current=current.replace('浏览器页面级联调未完成；原LoginPage组件+真实HTTP流程通过。','原LoginPage组件及本轮真实浏览器关键流程已运行；浏览器覆盖和未完成事项见p2-browser-regression.md。')
(D/'p2-api-migration.md').write_text(current.rstrip()+section,encoding='utf-8')
(E/'closeout-api-audit.json').write_text(json.dumps({'candidateCount':33,'implemented':32,'unimplemented':['API-009'],'approvedBackendFilesChanged':unchanged,'rows':proof,'staticAuditIsNotNewRuntimeTest':True},ensure_ascii=False,indent=2),encoding='utf-8')
print('33 API Controller/Mapper mappings checked; approved backend unchanged')
