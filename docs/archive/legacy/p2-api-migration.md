# P2逐条API迁移与实际状态

候选33条：32条已实现、编译、启动并做隔离测试；人员删除1条暂停。不是正式流量切换。URL、方法、Bearer/x-campus-token、成功包装、created201/其他200、顶层total和中文业务状态沿用。

|编号/原Express来源|原方法及URL|Java方法|实现/编译/运行|测试与差异/未完成|
|---|---|---|---|---|
|API-005 server/routes/admin.js:212|GET `/api/people`|PersonQueryController.list|是/是/是|隔离用例通过；非生产切换|
|API-006 server/routes/admin.js:229|GET `/api/people/:id`|PersonQueryController.one|是/是/是|隔离用例通过；非生产切换|
|API-007 server/routes/admin.js:237|POST `/api/people`|PersonAdminController.create|是/是/是|隔离用例通过；非生产切换|
|API-008 server/routes/admin.js:284|PATCH `/api/people/:id`|PersonAdminController.update|是/是/是|隔离用例通过；非生产切换|
|API-009 server/routes/admin.js:347|DELETE `/api/people/:id`|未迁移（无Java方法）|否/否/否|未运行；跨域删除契约待批准|
|API-010 server/routes/admin.js:367|GET `/api/users`|UserAdminController.list|是/是/是|隔离用例通过；非生产切换|
|API-011 server/routes/admin.js:377|POST `/api/users`|UserAdminController.create|是/是/是|隔离用例通过；非生产切换|
|API-012 server/routes/admin.js:416|PATCH `/api/users/:id`|UserAdminController.update|是/是/是|隔离用例通过；非生产切换|
|API-018 server/routes/auth.js:113|GET `/api/roles`|RoleController.roles|是/是/是|隔离用例通过；非生产切换|
|API-019 server/routes/auth.js:122|POST `/api/auth/login`|AuthController.login|是/是/是|隔离用例通过；非生产切换|
|API-020 server/routes/auth.js:163|POST `/api/auth/send-code`|AuthController.send|是/是/是|合成隔离用例通过；真实短信端到端未完成|
|API-021 server/routes/auth.js:192|POST `/api/auth/reset-code`|AuthController.resetCode|是/是/是|合成隔离用例通过；真实短信端到端未完成|
|API-022 server/routes/auth.js:225|POST `/api/auth/reset-password`|AuthController.reset|是/是/是|合成隔离用例通过；真实短信端到端未完成|
|API-023 server/routes/auth.js:275|POST `/api/auth/register-visitor`|AuthController.register|是/是/是|合成隔离用例通过；真实短信端到端未完成|
|API-024 server/routes/auth.js:372|POST `/api/auth/logout`|AuthController.logout|是/是/是|隔离用例通过；非生产切换|
|API-025 server/routes/auth.js:382|GET `/api/auth/me`|AuthController.me|是/是/是|隔离用例通过；非生产切换|
|API-026 server/routes/auth.js:396|PATCH `/api/auth/password`|AuthController.password|是/是/是|隔离用例通过；非生产切换|
|API-027 server/routes/credentials.js:78|GET `/api/faces`|FaceController.list|是/是/是|隔离用例通过；非生产切换|
|API-028 server/routes/credentials.js:88|POST `/api/faces/upload`|FaceController.upload|是/是/是|隔离用例通过；非生产切换|
|API-029 server/routes/credentials.js:129|GET `/api/vehicles`|VehicleController.list|是/是/是|隔离用例通过；非生产切换|
|API-030 server/routes/credentials.js:140|POST `/api/vehicles`|VehicleController.create|是/是/是|隔离用例通过；非生产切换|
|API-031 server/routes/credentials.js:177|PATCH `/api/vehicles/:id`|VehicleController.update|是/是/是|隔离用例通过；非生产切换|
|API-032 server/routes/credentials.js:218|DELETE `/api/vehicles/:id`|VehicleController.delete|是/是/是|隔离用例通过；非生产切换|
|API-049 server/routes/profiles.js:74|GET `/api/profiles/me`|ProfileController.get|是/是/是|隔离用例通过；非生产切换|
|API-050 server/routes/profiles.js:83|PATCH `/api/profiles/me`|ProfileController.update|是/是/是|隔离用例通过；非生产切换|
|API-051 server/routes/profiles.js:108|GET `/api/profiles/:role`|ProfileController.get|是/是/是|隔离用例通过；非生产切换|
|API-052 server/routes/profiles.js:117|PATCH `/api/profiles/:role`|ProfileController.update|是/是/是|隔离用例通过；非生产切换|
|API-055 server/routes/settings.js:123|GET `/api/messages`|MessageController.list|是/是/是|隔离用例通过；非生产切换|
|API-056 server/routes/settings.js:136|POST `/api/messages`|MessageController.create|是/是/是|隔离用例通过；非生产切换|
|API-057 server/routes/settings.js:166|PATCH `/api/messages/:id`|MessageController.update|是/是/是|隔离用例通过；非生产切换|
|API-058 server/routes/settings.js:194|DELETE `/api/messages/:id`|MessageController.delete|是/是/是|隔离用例通过；非生产切换|
|API-059 server/routes/settings.js:210|PATCH `/api/messages/:id/read`|MessageController.read|是/是/是|隔离用例通过；非生产切换|
|API-068 server/routes/settings.js:440|GET `/api/logs`|AuditController.list|是/是/是|隔离用例通过；非生产切换|

已批准差异：正常验证码成功响应不含code，仅保留phone/expireMinutes；未配置通道503；演示模式必须显式启用且满足隔离条件。Schema内Token改存摘要，客户端值/8小时语义保留；不接管原库旧Session。通行审计凭证值改摘要，满足不得记录完整Token的要求。

安全约束优先：普通账号缺少人员关联时，凭证接口404、原业务适配入口403，避免空范围导致全量数据泄露；正常账号请求契约不变。真实历史缺失关联账号暂不可直接切换，需要补关联或隔离。

响应对照：66组原GET路由+原SQL，与Java逐字段比较通过；写接口的成功/失败、字段和SQL结果由分批测试断言验证。没有宣称所有写接口所有异常分支完全等价。原people/users更新失败可能残留草稿变更的缺陷不复制到Java，Java验证失败不提交。

原P0车辆说明曾写lastAccess不在更新白名单；实际credentials.js明确处理该字段，本实现按实际代码保留，测试验证。资料与登录profile的标题分隔符差异保留；管理员profiles/me无目标仍404；公告read_flag仍共享。

保留在Express的4条聚合：GET /api/dashboard/admin、/api/dashboard/:role、/api/reports/summary、/api/reports/access，已实际调用通过。其余非用户域路由继续由隔离副本执行原逻辑。health保持原字段结构，值反映隔离库，非原库连接；没有修改原前端或原Express生产配置。

原LoginPage组件及本轮真实浏览器关键流程已运行；浏览器覆盖和未完成事项见p2-browser-regression.md。删除按钮在隔离环境尚不可用，不能宣称全部原页面功能已验收。详见p2-delete-contract.md及p2-test-evidence.md。

## P2收尾逐项复核（2026-10-19）

本表与上方33条逐项对应，U=UserMapper.xml，D=DomainMapper.xml。XML语句ID与实际Controller方法经只读脚本核验；真实运行依据链接中的HTTP/SQL断言，不把静态核验冒充SQL执行追踪。所有需登录的接口均经SessionAuthority查询session及当前user状态/角色；普通人不得由客户端角色头决定身份。字段类型展开、原错误包装及空值/省略规则见[原契约](api-contract.md)和原Express源码；未迁移原68条契约没有整体重写。

成功默认200，标注201的保留201；列表顶层total，客户端分页、原排序保留；失败保留success:false/error.message及可选details。未实施人员删除不属于“32条通过”。真实短信4条的合成测试不表示真实通道送达通过。

|API|Method/路径及Java方法|原请求 → 成功data契约|真实Mapper语句（另含公共鉴权）|服务端权限|运行证据|最终未完成/边界|
|---|---|---|---|---|---|---|
|API-005|GET `/api/people` / PersonQueryController.list|type?,keyword? → Person[]+顶层total|U.searchPeople|管理员|[真实HTTP/SQL断言](p2-evidence/batch2-1792403133519.json)|隔离通过；真实库未切换|
|API-006|GET `/api/people/:id` / PersonQueryController.one|path id → Person；缺失404|U.person|管理员|[真实HTTP/SQL断言](p2-evidence/batch2-1792403133519.json)|隔离通过|
|API-007|POST `/api/people` / PersonAdminController.create|Person必填/按类型扩展字段 → Person/201|U.people;D.createPerson|管理员；访客需远程黑名单通过|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；跨域黑名单故障安全拒绝|
|API-008|PATCH `/api/people/:id` / PersonAdminController.update|path id+人员白名单字段 → Person/200|U.lockPerson,people;D.updatePerson|管理员|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过|
|API-009|DELETE `/api/people/:id` / 未迁移（无Java方法）|path id → 原Person/200；原同步级联语义|无|管理员（设计）|未运行|未实现/未编译/未运行；等待删除方案审批|
|API-010|GET `/api/users` / UserAdminController.list|role? → SafeUser[]+total|D.users|管理员|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过|
|API-011|POST `/api/users` / UserAdminController.create|username,password,role,personId,accountType?/id?/status? → SafeUser/201|U.person,account,insertUser|管理员|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；原people页面分两次HTTP创建，不保证跨HTTP事务|
|API-012|PATCH `/api/users/:id` / UserAdminController.update|path id+username?/password?/role?/personId?/accountType?/status? → SafeUser|U.lockUser,account,person;D.updateUser|管理员|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；账号停用与人员状态不是同一字段|
|API-018|GET `/api/roles` / RoleController.roles|无 → roles/roleProfiles字典|U.roles,profiles|公开|[真实HTTP/SQL断言](p2-evidence/batch1-1792403129907.json)|隔离通过|
|API-019|POST `/api/auth/login` / AuthController.login|account或username,password → Session|U.account,lockUser,insertSession,audit,person,profiles|公开入口；校验账号密码及启用状态|[真实HTTP/SQL断言](p2-evidence/batch1-1792403129907.json)|六角色真实浏览器登录通过|
|API-020|POST `/api/auth/send-code` / AuthController.send|phone → phone/expireMinutes；演示显式code|U.code,saveCode|公开；隔离白名单及限流|[真实HTTP/SQL断言](p2-evidence/batch1-1792403129907.json)|正常无短信503；真实短信送达未测试|
|API-021|POST `/api/auth/reset-code` / AuthController.resetCode|account,phone → phone/expireMinutes；演示显式code|U.account,person,code,saveCode|公开；绑定号码匹配、隔离白名单、限流|[真实HTTP/SQL断言](p2-evidence/batch1-1792403129907.json)|正常无短信503；真实短信送达未测试|
|API-022|POST `/api/auth/reset-password` / AuthController.reset|account,phone,code,newPassword,confirmPassword → SafeUser|U.code,codeAttempt,account,person,password,deleteUserSessions,deleteCode,audit|有效一次性码及账号绑定；撤销全部会话|[真实HTTP/SQL断言](p2-evidence/batch1-1792403129907.json)|合成环境通过；真实短信端到端未测试|
|API-023|POST `/api/auth/register-visitor` / AuthController.register|name,phone,idNumber,code,password,confirmPassword,company? → registered/phone/user/person/201|U.code,codeAttempt,account,insertPerson,insertUser,audit,deleteCode|公开；黑名单通过后注册visitor，角色不可参数提权|[真实HTTP/SQL断言](p2-evidence/batch1-1792403129907.json)|合成环境通过；真实短信端到端未测试|
|API-024|POST `/api/auth/logout` / AuthController.logout|当前Token → loggedOut|U.deleteSession|六角色有效会话|[真实HTTP/SQL断言](p2-evidence/batch1-1792403129907.json)|浏览器退出后Java/Express均401|
|API-025|GET `/api/auth/me` / AuthController.me|userId?/account?仅管理员代查 → Session|U.user,account,person,profiles|本人；管理员可指定目标|[真实HTTP/SQL断言](p2-evidence/batch1-1792403129907.json)|隔离通过，Token仍为当前会话Token|
|API-026|PATCH `/api/auth/password` / AuthController.password|oldPassword,newPassword,userId? → SafeUser|U.lockUser,password,audit|本人；管理员指定目标仍校验原密码|[真实HTTP/SQL断言](p2-evidence/batch1-1792403129907.json)|普通改密保留其他会话，沿用旧契约|
|API-027|GET `/api/faces` / FaceController.list|userId?/personId?/role? → Face[]+total|U.user,person,profiles;D.faces|学生/教职工本人，管理员代查|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；无人员关联404|
|API-028|POST `/api/faces/upload` / FaceController.upload|管理员定位字段?+fileName?/imageUrl?/slot?/label? → Face/201|U.lockPerson;D.faces,insertFace,updateFace,updatePerson|学生/教职工本人，管理员代办|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；最多2槽位、人员状态同事务|
|API-029|GET `/api/vehicles` / VehicleController.list|userId?/personId?/role? → Vehicle[]+total|U.user,person,profiles;D.vehicles|教职工本人，管理员代查|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；无人员关联404|
|API-030|POST `/api/vehicles` / VehicleController.create|plateNo,ownerId(管理员必填),status?/lastAccess? → Vehicle/201|U.lockPerson;D.vehicles,vehicleCount,insertVehicle|教职工归属强制本人；管理员可指定|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；唯一车牌/每人2辆并发限制|
|API-031|PATCH `/api/vehicles/:id` / VehicleController.update|path id+plateNo?/ownerId?(管理员)/status?/lastAccess? → Vehicle|U.lockPerson;D.vehicle,vehicles,vehicleCount,updateVehicle|本人车主或管理员|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|实际原代码允许lastAccess，与P0静态注释不同|
|API-032|DELETE `/api/vehicles/:id` / VehicleController.delete|path id → 被删Vehicle|D.vehicle,deleteVehicle|本人车主或管理员|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；非人员跨域删除|
|API-049|GET `/api/profiles/me` / ProfileController.get|userId? → ProfileEnvelope|U.user,person,profiles|六角色本人；管理员须指定目标|[真实HTTP/SQL断言](p2-evidence/batch2-1792403133519.json)|隔离通过；原页面会传当前userId|
|API-050|PATCH `/api/profiles/me` / ProfileController.update|userId?(管理员),phone?,company?(visitor) → ProfileEnvelope|U.user,lockPerson,updateContact,profiles|六角色本人；禁止参数提权|[真实HTTP/SQL断言](p2-evidence/batch2-1792403133519.json)|六角色浏览器保存及回读通过|
|API-051|GET `/api/profiles/:role` / ProfileController.get|path role,userId? → ProfileEnvelope|U.user,users,person,profiles|管理员|[真实HTTP/SQL断言](p2-evidence/batch2-1792403133519.json)|隔离通过|
|API-052|PATCH `/api/profiles/:role` / ProfileController.update|path role,userId?,phone?,status? → ProfileEnvelope|U.user,users,lockPerson,updateContact,profiles|管理员|[真实HTTP/SQL断言](p2-evidence/batch2-1792403133519.json)|隔离通过|
|API-055|GET `/api/messages` / MessageController.list|role?(管理员),read? → Message含targetRoles[]+total|D.messages|六角色按受众；过滤旧预约通知|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；read_flag原本共享|
|API-056|POST `/api/messages` / MessageController.create|title,content,targetRoles或targetRole? → Message/201|D.insertMessage|管理员|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过|
|API-057|PATCH `/api/messages/:id` / MessageController.update|path id+title?/content?/targetRoles?/targetRole? → Message|D.message,updateMessage|管理员|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过|
|API-058|DELETE `/api/messages/:id` / MessageController.delete|path id → 被删Message原对象|D.message,deleteMessage|管理员|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；不强补targetRoles|
|API-059|PATCH `/api/messages/:id/read` / MessageController.read|path id+read?默认true → Message原对象|D.message,updateMessage|可见受众；不可跨受众操作|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；保留共享read语义|
|API-068|GET `/api/logs` / AuditController.list|role?,actor? → Log[]+total|D.logs|管理员|[真实HTTP/SQL断言](p2-evidence/batch3-1792403135217.json)|隔离通过；日志不含完整凭证|

32条实现/编译/运行与原隔离测试状态不变；人员删除无Controller方法、无Mapper、无运行证据，详细设计[待审批](p2-delete-detailed-design.md)。4个dashboard/reports跨域聚合仍在隔离Express，不计入这33条的Java完成数量。本轮浏览器结果及页面级剩余问题见[p2-browser-regression.md](p2-browser-regression.md)。
