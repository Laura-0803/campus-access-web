# 六类角色有效权限矩阵

依据：middleware/auth.js 的方法/路径规则 + routes内二次鉴权 + App.jsx页面入口。下表为静态有效权限，不是动态测试结果；管理员并非所有业务操作的超集。✓允许，—禁止，“本人”含历史名称/手机号兼容匹配，需后续收紧时明确契约变更。

|API/能力|学生|教职工|访客|校友|门岗|管理员|
|---|---|---|---|---|---|---|
|health、roles、登录、注册/找回验证码、重置、访客注册|公开|公开|公开|公开|公开|公开|
|auth/me、退出、改密码|本人|本人|本人|本人|本人|本人/指定账号（改密仍需旧密码）|
|profiles/me GET/PATCH|本人|本人|本人|本人|本人|指定userId；无参数可能404|
|profiles/:role GET/PATCH|—|—|—|—|—|✓|
|dashboard/admin|—|—|—|—|—|✓|
|dashboard/:role|本角色本人|本角色本人|本角色本人|本角色本人|本角色本人/值守校门聚合|指定角色/账号|
|预约列表/详情|被访相关|被访相关|本人|—|—|全部|
|被访人候选查询|✓|✓|✓|—|—|✓|
|创建预约|—|—|本人|—|—|可代录|
|审批预约|自己的被访人阶段|自己的被访人阶段|—|—|—|仅保卫处阶段|
|access-records GET/POST/simulate|—|—|—|—|✓|✓|
|个人记录/异常的dashboard聚合|本人|本人|本人|本人|按聚合语义|✓|
|exceptions列表/详情/分析|—|—|—|—|✓|✓|
|exceptions/chat|—|—|—|—|—|✓|
|exceptions PATCH/POST actions|—|—|—|—|✓|—|
|devices GET|—|—|—|—|✓|✓|
|devices POST/PATCH/DELETE|—|—|—|—|—|✓|
|faces GET/upload|本人|本人|—|—|—|可代查/上传|
|vehicles GET/POST/PATCH/DELETE|—|本人|—|—|—|全部|
|qr-codes GET/verify|—|—|本人|本人|全部|全部|
|qr-codes POST|—|—|本人且已批预约|本人|—（中间件通过但路由拒绝）|可代发|
|messages GET/PATCH read|受众|受众|受众|受众|受众|全部/筛选角色|
|messages POST/PATCH主体/DELETE|—|—|—|—|—|✓|
|people/users、reports、gates、access-rules、blacklist、logs|—|—|—|—|—|✓|

账号不存在/令牌缺失或过期401；禁用账号403；认证用户没有API权限403。路径参数role及请求userId不能替代登录身份。未匹配路径先鉴权，非管理员可能先收到403而不是404；health在认证中间件前。

页面细节：guard可通过现场处理页处置异常，却不能进入 App.jsx 的 `/exceptions` 页面；管理员异常页主要用于分析。UserManagementPage虽然导出且有API调用，但未在App.jsx独立挂载，人员页仍会调用账号管理接口；不能当作无用业务删除。普通角色记录通过dashboard获得，保留接口组合比放开全量列表更符合原行为。

待测试：六角色正向登录；学生读people 403；伪造userId；他人预约详情/审核；管理员异常处置403；门岗维护设备403；普通人读取不属于自己的QR；禁用/过期/登出会话。每条路由具体角色还可查 api-inventory.csv。
