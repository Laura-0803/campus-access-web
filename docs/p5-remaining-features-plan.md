# P5六项遗留功能实施候选方案

本轮只分析。以下文件、API和DDL均为拟修改范围，不是实施授权，也不是已测试功能。原四业务服务、React页面和业务契约本轮不改。复杂度按当前仓库相对工作量估计，不承诺日程。

## A React扫码模拟入口

当前：App.jsx的/identity-check挂载IdentityCheckPage现场异常处置；FeaturePages.jsx中的LegacyIdentityCheckPage含模拟表单但未挂载，api.simulateScan已存在，Java模拟及真实落库已测试。原请求POST /api/access-records/simulate，拒绝也200且allowed=false，不能只看状态码；硬件不在范围。

建议最小单独路由/scan-simulator，仅guard/admin，保持/identity-check原流程不变。拟修改src/App.jsx、src/config/roles.js、src/pages/FeaturePages.jsx；若发送可选Idempotency-Key，再局部扩展src/api/client.js，不改原方法现有调用方式。先复核旧组件状态和令牌展示，不能简单恢复隐藏组件就称安全完成。

使用现有credentialType、credentialValue、gate、method及可选deviceId；一次点击固定操作UUID，超时重试沿用Key，下一独立核验才换Key。不显示完整Token，不把二维码截图/输入写日志，不相信客户端角色；后端实时鉴权仍负责安全。数据库不增表，使用原access_requests/outbox；每次真实独立核验可能产生记录，页面应明确说明。

复杂度中。测试真实Edge六角色路由/按钮、有效码/拒绝/停用设备、重复点击及网络重试一条记录、异常自动生成、故障503；回滚撤回新路由和菜单，保留已产生的真实测试事实，不删除记录。需要单独批准页面入口，现未实施。

## B React通行规则验证入口

当前RulesPage有validatorForm/validateRule函数，但无对应JSX；现有规则编辑及校门管理可用。POST /api/access-rules/validate已实现，为只读判断，不生成通行记录。原默认普通凭证是campusCard，必须保持原前端API参数及管理员权限。

建议只在原/rules管理员页面新增验证Panel，复用现有状态/函数和api.validateAccessRule；拟仅改FeaturePages.jsx及必要测试。展示allowed、reason、人员/校门/规则白名单简表，明确“验证不登记通行”。不增加后端API/DDL、不开放guard规则管理，不把503当未命中或允许。凭证输入遮罩、结果不输出完整Token。

复杂度低至中。真实Edge验证无权角色不能打开/直接调用；非法时间、跨午夜、校门关闭、身份未知、预约未知、有效/撤码、设备传入时状态检查；验证前后记录数量不变。回滚仅移除Panel，不恢复旧的时间解析放行缺陷。现未实施。

## C HOLD操作查询与人工恢复

当前appointment_issuance有phase/hold_reason/attempts/租约及加密会话；GET /internal/issuance-status/:id仅服务密钥查询，未提供管理员公共API、列表或人工恢复动作。后台仅自动处理非HOLD命令；不能解密/展示原Token、直接清hold_reason或用新管理员替代原主体自动续跑。

建议分两次审批：先只读管理查询（拟GET /api/issuance-operations及/:id），后可控人工决策协议。拟新建预约域IssuanceOperationController/Service/Mapper及XML、审计事件；React新增管理员受限视图，再修改App.jsx、roles.js、client.js。当前内部接口不应直接经Gateway放给浏览器。按预约/操作ID、阶段筛选，脱敏错误，所有访问审计。

恢复前重验当前管理员和原操作权限、当前预约/人员/黑名单、access签发槽及真实凭证状态；UNKNOWN先查同操作，禁止二次造码或撤销可能已生效的码。AUTHORIZATION_REVOKED、APPOINTMENT_CHANGED、SIGNING_REJECTED分别制定可审查决策：默认维持阻断，恢复或取消的主体授权、围栏及凭证撤销协议均需另批。拟新增人工决策/版本/操作者审计表，不跨库写。保留200仅已确认签发成功、未知503；任何公共新API/新错误语义必须审批。

复杂度高。真实SQL故障、丢回执、并发人工决策、角色撤销、过期租约、已撤码、原主体失效等全矩阵；回滚关闭公共操作入口，保留持久命令和审计，不批量清HOLD/回滚有效凭证。本轮只读摘要确认既有HOLD完全不变。

## D 未绑定预约的身份关联及最终审批

原管理员可按姓名/电话代录visitorId=null，旧最终审批200/qrCode:null；已批准当前503原包装、不改变状态、不生成码，不能伪造绑定或永久忽略该场景。

建议新增显式管理员关联协议（拟PATCH /api/appointments/:id/identity），不默默改变原POST/PATCH审核含义。拟AppointmentIdentityController/Service、UserDirectory受保护查询扩展、AppointmentMapper条件更新/身份关联历史SQL；React管理预约中增加明确“关联已核实访客”步骤，修改FeaturePages.jsx/client.js。人员需通过已存在user-service合法创建/核验，不依赖姓名电话模糊匹配自动选择，不复制真实资料；记录关联依据、操作者和版本，最小化隐私展示。

只允许未最终决议且不存在签发槽的代录预约，锁预约重验状态/权限/黑名单；确认所选访客身份和预约证件一致后提交关联历史，再通过原最终审批链路得到真实200及QR。已接纳签发、存在HOLD或身份冲突不可强改。拟新增本域关联历史/版本检查，不直接修改users或qr_codes；新端点/UI及是否允许重新关联须单独审批，旧503保护审批前保持。

复杂度高。测试错误人员、停用/黑名单、越权、并发关联与审批、重放/回执丢失、历史审计、关联后QR真实核验；回滚关闭新入口，已关联/签发不能随意解绑，使用受控撤销和前向恢复。现未实施。

## E 人员删除跨服务Saga

当前DELETE /api/people/:id没有Java方法，隔离入口404；原人员页仍有删除按钮但不可用。p2-delete-detailed-design.md为历史设计，当时正式access尚未开发的前提已过时；现在access已存在，仍没有人员级撤销围栏、删除代次和全域回执，不能拿单码revoke冒充人员Saga。

建议沿用历史设计的operationId/personId/generation、持久操作/围栏/outbox、接纳时停用及撤会话、按域幂等撤销/引用脱钩、最终用户域清理、审计和墓碑。拟user-service新增PersonDeletionController/Service/Mapper与迁移；access-service新增人员围栏/批量幂等撤销/状态查询并覆盖所有签发核验；appointment-service保留历史并围栏检查/引用协调；Gateway仅审批后开放DELETE。exception历史事实不因删人删除。React只在批准成功/未知响应协议后接回原按钮。

同步200原Person只有所有域持久完成才返回；接纳后未知503、重复成功重放、Operation查询/响应头均是待批准新契约，绝不自行加202或删除中字段。权限仅admin且跨域服务身份保护；每域独占自身表，不跨库写。

复杂度最高。测试20并发、签发/核验竞争、QR撤销后用户提交失败、主机/进程崩溃、丢回执、乱序代次、权限撤销、历史引用保持；回滚仅关闭入口并继续已接纳操作的安全恢复，不复活会话/凭证。本轮不新增DDL、代码或worker。

## F 管理员账号停用页面入口

当前UserManagementPage已编写但未在App.jsx挂载；/people的toggleStatus修改people.status，不能等同users.status。PATCH /api/users/:id的启用/停用和旧Token拒绝已有真实测试；/people创建/编辑关联账号可用，不等于账号停用入口可用。

建议批准后优先只增加账号状态列表入口（admin），拟App.jsx、roles.js、FeaturePages.jsx的最小只读列表+status按钮，复用GET /api/users及PATCH /api/users/:id，不新增DDL或改后端契约。不要直接整页挂载旧UserManagementPage：其按证件尾号/123456重置密码属于弱密码风险，应保留隐藏，不借本任务开放。是否防止最后一个管理员/自停用是新规则，先报告不能自行更改已通过后端语义；UI确认应清楚区分人员与账号状态。

复杂度低至中。测试六角色路由/直接API、停用即时拒绝Java及Express、重新启用及原角色语义、同时编辑、失败提示；回滚新菜单/路由，不批量恢复已停用账号。现未实施。

## 建议批次与审批范围

首批仅A+B+F前端最小改动（上述四个src文件，后端0文件），分别审核；若A需可选请求Key，只扩展client.js兼容参数。第二批C只读查询，新端点另批；人工恢复、D身份关联、E删除Saga各自单独审批，禁止捆绑。当前P5修改范围仅docs工具/证据/文档及.private路径忽略规则，不含任何业务实现。
