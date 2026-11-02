# P5第二批 A/B/F 验收提交

2026-10-20。仅隔离开发，提交审核后停止。未开发C/D/E，未切换正式流量。

|功能|页面已实现|API已接通|真实浏览器已验证|业务流程已通过|尚未完成|
|---|---|---|---|---|---|
|A 扫码模拟|是，/scan-simulator|既有simulate接口|Edge真实表单点击|允许、拒绝、去重、未知结果恢复|真实硬件不在范围；跨浏览器恢复未实现|
|B 规则验证|是，原/rules内新增面板|既有validate接口|Edge真实表单点击|合法、非法时间、跨午夜、未知人员、服务故障；记录数不变|未知预约分支本轮未单独进行页面故障测试|
|F 账号状态|是，/account-status|既有users列表及PATCH|Edge确认框及按钮点击|停用、Java/Express旧会话拒绝、启用重登|自己停用及最后一名启用管理员停用保持页面保护，待审批|

生产构建通过，四文件Babel语法与静态约束通过。最终专项64项、完整业务回归56项通过；不是120个独立API，也不代表覆盖所有边界。没有重新编译或改动Java业务。

## 文件与证据

业务源码仅改四个：`campus-access-web/src/App.jsx`、`src/config/roles.js`、`src/pages/FeaturePages.jsx`、`src/api/client.js`（后三个相对内层前端目录）。分别新增路由/菜单、三个局部功能、兼容可选幂等键及错误状态。原identity-check路由与功能保留，没有挂载旧UserManagementPage。

- [修改前副本及SHA256](p5-frontend-evidence/four-file-baseline.json)
- [四文件前后SHA256及204文件范围校验](p5-frontend-evidence/source-preservation.json)：200个未变，仅授权四个变化。
- [生产构建结果](p5-frontend-evidence/build-20261020T215124852721/result.json)、[原始构建日志](p5-frontend-evidence/build-20261020T215124852721/npm-build.log)
- [语法与静态检查](p5-frontend-evidence/static-1792504295629.json)
- [64项真实页面专项](p5-frontend-evidence/browser-1792504296486/report.json)、[56项整体业务回归](p5-frontend-evidence/flow-1792504442993/report.json)
- [原19表数据与DDL及备份校验](p5-frontend-evidence/preservation-final.json)
- [原归档全部文件哈希比较](p5-frontend-evidence/archive-source-preservation.json)、[源码清单62项含全部Express比较](p5-frontend-evidence/original-source-preservation.json)
- [原14项HOLD保持一致](p5-frontend-evidence/hold-after.json)、[最终健康检查](p5-frontend-evidence/health-final.json)、[全部11个测试端口关闭](p5-frontend-evidence/closure-final.json)
- [敏感值文本检查](p5-frontend-evidence/secret-audit-final.json)：匹配范围内无私密配置、现有会话或凭证完整值；不是通用泄密检测器。

P0文档记载68个应用文件，本轮直接比较原ZIP实际69个非目录成员，65个不变，仅授权4个前端文件变化；另源码清单62项中58项不变。统计口径分别保留，不声称68个全部未改。全部原Express文件保持不变；Java、Gateway、数据库结构、认证规则未改。原19张业务表与备份不变，测试新增记录仅在隔离合成数据库。敏感输入和二维码在截图中遮罩。

## 限制及回滚

账号自停用/最后管理员规则未在后端定义，本轮只暂停对应页面分支，不能宣称新增了服务端全局约束。扫码未确认操作保存在当前用户的sessionStorage中，只含操作ID、凭证摘要与条件，不含原凭证；刷新需重新输入相同凭证。关闭整个浏览器后的跨设备恢复不在本轮范围。

回滚仅将四份input/src备份恢复到对应前端文件并重新构建，不执行数据库回滚、初始化或旧修复脚本。C/D/E、人员删除、无绑定人员最终批准和HOLD人工恢复继续禁用。仍依赖Express过渡聚合，原68条API迁移统计不变。
