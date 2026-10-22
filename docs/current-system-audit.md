# P0 原系统全面分析

日期：2026-10-19（Asia/Shanghai）。本阶段只分析、备份和验证；未修改原业务代码、前端界面、配置、数据库数据或表结构，未创建 Java 工程。

## 依据与范围

已完整阅读外层《Codex改造实施说明.md》（V1.0，15节及阶段模板）；用户指定的长文件名在根目录不存在，此文件内容与任务一致。原始教师任务书/PPT未随工程提供，因此课程要求以该说明转述为依据，尚不能宣称已直接复核教师原件。

外层为工作区 `D:/1 信息系统软件架构/campus-access-web`，内层 `campus-access-web/` 才是 npm 应用根。两层 `git rev-parse --show-toplevel` 都失败；外层 `.git` 是空目录，无法确认有效 Git 仓库根、HEAD 或生成可信的 git diff。未擅自 git init。未发现适用的 AGENTS.md。

检查全部自有 JS/JSX、SQL、样式、HTML、规则模型、配置和运行脚本；逐文件依赖、导出、API使用、行数及 SHA256 见 source-inventory.csv，57 个 JS/JSX 经 Babel 解析；共62份文本源文件纳入该表。package-lock 另核对真实锁定版本，db.json/seed 仅分析结构与角色数量，不输出账号口令或个人数据。node_modules、dist、IDE、日志为依赖/产物，不当作待迁移业务源码。

## 目录与职责

|目录/文件|当前职责|迁移影响|
|---|---|---|
|src/App.jsx、main.jsx|SPA入口、localStorage会话、RoleGate、角色主页重定向|保留路由、登录失效事件|
|src/api/client.js、useApiData.js|62个请求封装、Bearer、统一解包、错误广播与加载回退|保持 `/api`、字段和响应类型|
|src/config/roles.js|六角色名称、主页、扁平/分组菜单、默认展示资料|展示配置不是可信鉴权来源|
|src/pages/LoginPage.jsx|登录、访客注册、验证码、找回密码|保留本地演示验证码说明|
|src/pages/RoleDashboard.jsx|五类非管理员驾驶舱、访客申请、校友QR|依赖聚合API而非直接访问所有领域接口|
|src/pages/AdminDashboard.jsx|统计卡片、趋势、异常与预约概览|需服务级统计聚合|
|src/pages/FeaturePages.jsx|资料、人脸、车辆、预约、核验、异常、设备、QR、报表、人员、账号、公告、规则、黑名单、日志|大型集中页，按API迁移，不重做UI|
|src/components/layout|侧栏、顶栏、公告栏、外壳、导航|侧栏异常数也消费API，不能遗漏|
|src/components/ui、charts、flow|表格客户端分页、二维码绘图、统计图、流程展示|QRCodeMock名称不代表真实硬件；流程图是展示|
|src/data/mock.js|静态演示数据|不能当作真实库或验收证据|
|server/index.js|Express5、CORS、JSON10MB、统一/api、静态dist、错误处理、启动initStore|Gateway逐步接管；健康接口在鉴权前|
|server/middleware/auth.js|公开白名单、Bearer/x-campus-token、8小时会话检查、角色权限|还须合并路由内二次鉴权|
|server/routes/（11文件）|68条路由含health，覆盖所有原业务|全量见API CSV；不能只迁移页面当前调用者|
|server/lib/store.js|MySQL18表、旧app_state导入、快照、串行更新、自动迁移|必须替换为服务内MyBatis行级持久化|
|server/lib/accessPolicy.js|QR/校园卡/人脸/车牌统一决策|查黑名单、校门、角色规则和时间|
|server/lib/passwords.js、time.js、validators.js|PBKDF2、上海时间/ID、手机号与车牌规则|Java须兼容旧盐字符串和编号|
|server/lib/blacklist.js、qrPayload.js、messageTargets.js|凭证标准化/掩码兼容、扫码载荷提取、公告受众|保留JSON/URL/纯Token输入与多角色受众|
|server/lib/accessRecordView.js、http.js、env.js|personCode补全、响应、环境配置加载|不要泄露配置值；保留展示衍生字段|
|server/lib/exceptionAgent.js、server/agents|本地JSON规则评分及自然语言路由/时间筛选/结果表格|非外部LLM、非模型训练，不得宣传为真实AI识别|
|server/db/schema.sql、server/data|18表DDL、种子、历史JSON快照|DDL与实际库有差异；JSON不是在线事实源|
|scripts/dev-full.js|同时启动Node API与Vite|未来不能继续以Node业务提供者冒充Java完成|
|scripts/init-db.js、apply-gate-fixes.js、sql-fix-gates.js|有建库/改表/覆盖校门及删除设备等行为|P0均未执行|
|scripts/inspect-db.js|硬编码配置的局部查询|P0改用独立只读审计脚本，没有改此文件|
|vite.config.js|`/api -> localhost:3001`，React和图表分包|P6才指向Gateway|
|README.md|部分说明仍描述app_state/过时依赖|未来更新，不能以README代替源码事实|

## 当前业务与隐含契约

预约：访客身份取会话；管理员可代录；被访人按人员ID/学工号匹配，允许student/teacher/admin。普通被访人进入“待被访人审核”，通过后“待保卫处审核”，最终通过才可能自动出QR；被访人为admin直接进入保卫处审核。历史“待审核”被兼容并在启动迁移中改写。拒绝终态“未通过”。管理员代录但无visitorId时，可审批通过而不会自动生成二维码，不能写成所有通过记录都有QR。

审批审计目前共用 reviewer/reviewedAt/reviewComment，第二阶段覆盖第一阶段，尚无独立双阶段历史/reviewerId/version列。进程内写队列保证单进程串行，不是多实例并发保护。

通行：simulate 为软件模拟，成功/拒绝均产生通行记录；拒绝产生异常和操作日志；车牌成功更新最近通行。人工补录允许陌生人使用“人工核验后放行/现场放行”，没有自动执行全部策略。`/qr-codes/:id/verify` 只返回决策，不写通行记录和异常，不能与simulate混为一谈。

QR规则不消耗次数：max_uses/used_count仍在DDL，实际读取不返回，启动迁移把已有计数归零；未实现通行方向/重复请求幂等/重复异常去重。QR校验未重新检查预约最终状态，且非法/缺失有效期可能被视为active。普通凭证检查人员状态，QR路径缺少同等人员状态校验。

人脸最多2槽位，仅保存照片与“已上传”状态；模拟核验通过人员编号与已上传记录判断，不是真实人脸特征比对。教师车辆最多2辆，车牌唯一主要靠进程内查重，没有数据库唯一键。

密码为PBKDF2 SHA256，120000次、32字节，salt是16随机字节的hex字符串，Node派生时使用该字符串本身。新Java若把salt当作hex解码后的字节会破坏兼容。Session为随机UUID，数据库明文Token，过期8小时；修改密码不自动撤销全部旧会话，而重置密码会撤销。验证码在进程内Map，5分钟有效、60秒发送间隔，返回code用于演示，不是真实短信，双实例会有一致性问题。

个人记录/异常页面使用 `/dashboard/:role` 中的records/exceptions，普通用户并不直接调用受限的 `/access-records`、`/exceptions`。因此这些菜单与服务端权限并不矛盾。管理员 `/profiles/me` 不传userId会找不到用户，前端目前有传；改造时需在兼容测试覆盖。

## 结果与入口

68条后端路由、62个前端封装全部对应；后端另有6条未封装入口：见API CSV。六角色有效权限见 role-permission-matrix.md；18表168字段及实际库额外字段见 database-dictionary.md / database-migration.md。所有目标服务与表均有唯一归属，见 service-boundaries.md。兼容性仅做官方资料初查，未运行Java原型、未锁版本。

实际环境、命令、测试边界和备份结果见 test-evidence.md；风险见 technical-risks.md；阶段判断见 acceptance-checklist.md。P0源码盘点完成，业务动态回归、备份恢复演练未做，P1等待用户明确确认。
