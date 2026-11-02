# React真实功能入口及缺口

原src/App.jsx及src/config/roles.js未改。静态调用和真实UI测试分开：API清单中47条Java路径有活动组件调用候选，15条Java路径没有活动页面直接调用；前者不等于全字段/全角色均已UI验收。P0行号不因后端迁移而变化。

|实际页面|后端与可操作范围|明确限制|
|---|---|---|
|/login、/profile|Java登录、找回/注册合成演示、个人资料、修改密码|真实短信送达未测试；默认正常无通道503|
|/visitor、/review、/appointments、/appointment-status|Java提交、被访人审核、管理员最终批准/拒绝、列表状态|只有已绑定人员最终200真实码；无绑定503|
|/visitor-qr、/alumni-qr|原SVG二维码展示/既有签发操作|dashboard读取仍Express聚合；新增撤码无活动按钮|
|/records、/monitor|guard/admin调用Java记录；普通角色读本人Express dashboard|不等同扫码模拟UI|
|/identity-check|guard现场异常选中、拒绝、人工核验登记与动作|不是扫码表单；人工登记与处置两请求非全局事务|
|/exceptions|admin Java列表/统计/问答；普通角色本人Express聚合|App未给guard此路由，guard走原现场台，不因隐藏组件推断全处置面板可达|
|/people|Java人员/关联账号创建编辑、人员状态|人员停用不等于users.status；删除按钮仍不可用|
|/face、/vehicle、/vehicles、/devices|Java既有业务操作|人脸仅照片/元数据，非硬件识别；每个细分UI动作未全部重测|
|/rules|Java规则编辑与校门管理|validateRule函数存在但JSX无验证器|
|/blacklist、/announcements、/logs|Java名单管理、公告及审计查询|公告read接口无页面调用；日志为现有安全白名单|
|/admin、其他角色首页、/reports|Express过渡聚合Java权威数据|不是Java聚合完成；停桥后页面会失败|

只通过脚本/原API客户端访问的原Java接口：API-004模拟扫码、006人员详情、015预约详情、018角色字典、025当前用户、027人脸列表、033二维码列表、035单码verify、045单异常分析、046单异常详情、047直接PATCH状态、051/052角色资料、059公告已读、063规则只读验证。详情可能在列表/聚合中展示，但不等于调用对应详情API。

另外新增POST qr-codes/:id/revoke无UI；受保护/internal/issuance-status/:id仅内部只读查询，无管理员公开HOLD查询/恢复；UserManagementPage未挂载，无独立账号停用入口。不能通过新增路由偷偷开放其弱默认重置密码功能。LegacyIdentityCheckPage未挂载；不能把其模拟代码位置当作页面存在。

本轮真实Edge回归覆盖六角色登录、资料/退出，预约两审与真实QR图形解码，原门岗拒绝、黑名单新增/移出、记录/异常/规则页面。扫码及validate在真实浏览器调用原API客户端并走真实SQL，报告明确不是按钮点击。A–F具体方案见[p5-remaining-features-plan.md](p5-remaining-features-plan.md)，本轮全部未实施。
# 2026-10-20 第二批当前状态补充

以下原前置分析保留为历史记录。“原src未改”“扫码/验证只有脚本入口”等实施前描述已由本段更新：A新增/scan-simulator（guard/admin），B在/rules新增管理员验证面板，F新增/account-status（admin），均完成真实Edge专项及整体回归。详见[p5-frontend-acceptance.md](p5-frontend-acceptance.md)。原identity-check保留；C/HOLD、D无绑定审批、E人员删除仍未开放。账号自己停用及最后管理员停用页面分支待审批。不能将后端已实现等同全部页面边界已测。

