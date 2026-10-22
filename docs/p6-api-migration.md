# P6 接口迁移对照表（实际实现）

2026-10-20。已读取P5最终清单、系统审计、前端验收/浏览器报告、评分矩阵、启停说明及服务边界；已逐行检查原dashboard.js、reports.js、index.js、auth.js及对应Java内部控制器。下列五条现已由Java实现，HTTP/SQL与无Express浏览器证据见p6-test-evidence；初始对照表已归档input/docs。

|原ID|Method / URL|参数及权限|成功data与额外包装|当前 / 拟处理者|
|---|---|---|---|---|
|001|GET /api/health|原公开；Java健康公开，不依赖旧Adapter头|service、status、store、dataFile；批准的分布式差异|HealthController.health|
|036|GET /api/dashboard/admin|仅admin；无业务查询参数|summary、stats、accessTrend、riskData、realtimeRecords、exceptions、appointments、devices|DashboardController.admin|
|037|GET /api/dashboard/:role|已登录六角色；非admin路径role须等于当前role，userId若存在须为本人；admin可代查userId|role、user、profile、person、cards、appointments、records、vehicle、face、faces、qrCode、exceptions|DashboardController.role|
|053|GET /api/reports/summary|仅admin；无业务查询参数|access、appointments、exceptions、devices、accessTrend、riskData|ReportController.summary|
|054|GET /api/reports/access|仅admin；status、gate非空时精确匹配，可组合|data为原记录数组，根对象total为筛选后数量|ReportController.access|

所有成功HTTP 200，包装`{success:true,data:...}`；reports/access额外根total。错误为`{success:false,error:{message:...}}`，无details值时字段省略，不加入null。Token取Authorization Bearer优先，其次x-campus-token；不采用客户端角色头。无效身份401、停用403。/dashboard/admin优先于动态role映射，不能被代查逻辑绕过。

## 管理员首页

summary字段：today（上海日期字符串）、todayAccess、accessTotal、appointmentTotal、pendingAppointments、alumniAccess、exceptionTotal、pendingExceptions、highRiskCount、deviceTotal、onlineDevices、onlineRate；除today外均数字。

统计口径严格沿用：今日按time前10位；待审仅“待保卫处审核”；校友通行按type“校友”；待处置为status不等于“已处理”；高风险只统计待处置；在线率为在线/设备总数×100四舍五入，零设备为0。stats是固定5项卡片数组，每项title/value/desc/type，value为中文千分位格式字符串或百分比字符串。

realtimeRecords、exceptions、appointments按time字符串降序，稳定排序取前10；devices保持来源顺序。趋势取通行及异常中有效YYYY-MM-DD前缀的日期并集，排序后最后7个“有数据日期”，不是补零的最近7个自然日；day仅MM-DD。riskData按低、中、高固定顺序，仅输出非零项name/value。

## 角色首页与空值

admin指定userId时精确查用户，未指定则取来源顺序第一个该角色账号；若未找到，回退角色默认档案。effectiveRole取选中账号role优先，再取路径role。不存在角色404。普通用户只能以自己账号解析上下文，不能借userId代查。

profile包含personId/name/role/type/status/code/phone/gate；personId回退null，文字回退空串。user仅id/username/accountType/role/personId/status或null；person为人员或null。vehicle选所属车辆中lastAccess最新，否则第一辆，否则null；face为标准化faces第一项或null；qrCode为范围内validTo最新或null。不得把null变成空对象。

预约归属：student/teacher先hostId匹配，再旧数据host姓名/编号；visitor先visitorId，再visitor姓名、电话或证件；effectiveRole admin看全部，其余无预约。通行：guard按人员gate（未绑定gate原行为全部），其他角色按personId/ownerId/visitorId/hostId顺序遇首个非空ID即比较，不再回退姓名；无ID才按姓名、电话或编号兼容。异常使用同一归属规则。records补personCode：人员code优先，再记录自身code，最后空串。

二维码：仅visitor/alumni，类型相符；ownerId匹配或访客visitorId匹配，旧数据无ownerId时按profile.name。不得因状态过期自行删除首页数据。人脸按personId取，缺slot按原索引补primary/secondary及原中文label，然后primary优先稳定排序。角色卡片保留原标题/文字/字段/中文千分位；不复制审批、核验或异常处置业务，只做只读展示组合。

## 报表

summary.access：total/byStatus/byType/byGate；appointments：total/byStatus；exceptions：total/byRisk/byStatus；devices：total/byStatus。分类键取字段真值，否则“未分类”；零条时分类为空对象，total为0。趋势/风险同管理员首页。

reports/access不添加personCode、不重排时间；保留来源sort_order,id对应顺序和全部原记录响应字段。status/gate空串不筛选。重复查询参数/数组/对象参数需在对照测试中与Express核实，不能在未验证时宣称全部兼容。

## 非公开依赖（不是新增68条API分子）

原user-service的LegacyClient曾按legacy-bridge请求POST /internal/blacklist-check。已按批准仅改变Feign目标为exception-service，AuthServiceImpl访客注册及AdminServiceImpl创建/修改访客保留原检查逻辑。命中403、故障/熔断503，未默认放行。类名和旧components中的legacy诊断标签保留，不代表仍发送业务HTTP给Express。真实验证见p6-test-evidence。
