# Codex 执行文档：智慧校园出入管理系统 Java 微服务改造

> 版本：V1.0｜日期：2026-10-19｜性质：实施规格、迁移验收清单及 Codex 分阶段指令
>
> **重要：本文是面向现有代码的目标改造方案，不表示 Java 微服务已经编写、运行或测试通过。** 开发时必须以真实运行结果为准。凡标注“拟定”的技术版本、端口、服务边界均须先验证或经指导教师确认。

## 0. 一句话目标与严格要求

在 **不推倒重做 React 前端、不破坏现有业务与 API 契约、不丢失数据库数据** 的前提下，把现有 **React/Vite + Node.js/Express + MySQL** 单体后端重构为 **Java + Spring Boot + Spring Cloud + MyBatis** 的可运行微服务系统，完成 Eureka 高可用注册中心、客户端负载均衡、OpenFeign、服务熔断、Gateway 网关、业务分层及真实验证证据。

**严禁**：仅创建空 Maven 模块、伪造运行日志/测试截图、将所有业务保留在 Express 中然后把 Java 当代理、先删除旧后端、在开发机上使用不兼容的 Spring 依赖组合、把模拟扫码写成真实硬件联动。

## 1. 依据和要求优先级

### 1.1 老师文件中的明确要求（必须满足）

- 成绩构成：软件开发文档 20%、课程设计报告 40%、软件代码 40%；报告内部系统设计报告 20%、系统开发报告 80%。
- 系统设计报告：系统总体功能、系统流程图、数据库设计，**至少 5 张表**（含登录、用户基本信息、业务数据）。
- 系统开发报告：注册中心及高可用集群、客户端负载均衡、OpenFeign、服务熔断、Gateway 的创建过程。
- 评分说明列明实际技术：**Eureka、高可用集群、Ribbon、OpenFeign、Hystrix、Gateway**；服务提供者要实现 `controller/service/dao/entity/mapper`；MyBatis 实现对单一实体类的操作。
- 任务书的详述还要求单一实体、一对多、多对多关系的设计说明，及模块设计、类和方法说明。
- 验收：5 位老师对 1 位学生，5 分钟运行演示、3 分钟问答。课程设计日志每两次上机一份；具体提交节奏以授课安排为准。

### 1.2 需要确认的冲突（阻塞版本锁定，不阻塞业务设计）

评分说明指定旧组件 Ribbon/Hystrix；课程 PPT 同时讲较新 LoadBalancer/Resilience4j/Sentinel，并列出 Spring Boot 3.4.3。**不可在 Spring Boot 3.x 项目中直接默认加入 Ribbon/Hystrix**。在老师尚未答复之前：

- `LEGACY_STRICT` 路线：必须演示 Ribbon+Hystrix，先做**兼容矩阵验证与最小可运行原型**，再锁定一套受支持/可运行的旧版 Spring Boot + Spring Cloud 组合；Gateway、Feign、Eureka也须以同一发行列车兼容为前提。
- `MODERN_APPROVED` 路线：若老师允许替代，使用 Spring Boot 3.x + 匹配的 Spring Cloud，采用 Spring Cloud LoadBalancer + Resilience4j；在报告中如实写实际组件，**不得虚报已经实现 Ribbon/Hystrix**。
- 不得自行假定确切版本已验证；先输出 `docs/compatibility-decision.md`，写明使用的 JDK/Maven/Boot/Cloud/各组件版本、官方兼容依据和最小启动结果。可将具体版本暂列为待确认项。

## 2. 已核对的现有工程事实

压缩包实际前端工程路径为 `campus-access-web/campus-access-web/`；外层还包含 IDE/Git 文件，**修改前应确定真正仓库根目录**，不要误入 `node_modules`、`dist`、日志文件或嵌套目录。

- `package.json`：React 18、Vite 5、Express 5、mysql2、qrcode；开发脚本 `dev`、`dev:full`、`api`、`db:init`，不是 Python 系统。
- `server/index.js`：Express 统一服务入口，挂载 `/api`、多套业务路由，默认 API 端口 3001。
- `server/lib/store.js`：mysql2 + 集中内存快照 `getData/updateData`，存在全局串行写队列；这部分不允许多服务复制。
- `server/db/schema.sql`：18 张业务与配套表，包括 `roles`、`role_profiles`、`users`、`people`、`appointments`、`access_records`、`exceptions`、`devices`、`vehicles`、`faces`、`qr_codes`、`settings`、`gates`、`access_rules`、`blacklist`、`logs`、`messages`、`sessions`。
- `src/api/client.js`：前端统一请求入口，默认同源 `/api`，Bearer 令牌，成功 `{success:true,data:...}`，错误 `{success:false,error:{message,details}}`。
- `vite.config.js`：开发代理 `/api -> http://localhost:3001`；迁移时需切换到 Gateway 端口，**不要直接改所有页面**。
- `src/config/roles.js`：学生 `student`、教职工 `teacher`、访客 `visitor`、校友 `alumni`、门岗 `guard`、保卫处管理员 `admin` 六类角色。
- `server/middleware/auth.js`：公开路由、Bearer Session、身份校验、按请求方法和路径鉴权；新 Java 端须等效恢复，而且必须以服务端身份为可信来源。
- `server/routes/appointments.js`：访客预约、被访人审核、保卫处审核、成功后二维码相关业务；迁移必须保持状态机与越权防护。
- `server/routes/accessRecords.js`：`/access-records/simulate` 用于软件模拟核验，非硬件真连接。
- 部分页面具有人脸相关功能或数据模型；如果课设决定取消上传/真实人脸，须显式列出变更并同步调整前后端，而不是默默保留假功能。

## 3. 改造范围与“不修改”清单

### 3.1 必须保留的用户体验

- React 页面、侧栏菜单、布局与主要交互尽量保留；不为迎合 Java 课程而整体改成 JSP。
- 六类角色和原有页面入口、可用的业务功能以及筛选、分页、统计展示。
- 用户登录/退出/密码修改、访客注册、两阶段审核、校门模拟核验、二维码、异常处置、管理员后台。
- 公开 API 前缀 `/api`、已被前端消费的路径/HTTP 方法/JSON 字段/响应包装/分页元数据；改动时先更新契约测试再修改前端。

### 3.2 优先不做的事项

- 不重新设计 UI，不引入手机端或全新业务，不接真实摄像头/刷卡器，不加入真实短信发送、真实人脸识别或 AI 大模型付费接口。
- 异常智能分析、复杂统计、通知等可放到第二期，但保留已有页面所需的安全降级和基础数据接口，不可让菜单变成全面报错。
- 删库、删除原数据、直接覆盖生产 `.env`、提交凭证到 Git，均禁止。

## 4. 目标系统架构与服务边界

```text
浏览器 React/Vite
       │ /api/**
       ▼
  gateway-service ───────────────→ 路由 / 安全校验 / 统一响应
       │
  ┌────┼──────────┬─────────────┐
  ▼    ▼          ▼             ▼
user-service  appointment-service access-service exception-service
  │          │  OpenFeign        │     │
  └──────────┴───────────────────┴─────┘
       Eureka ×2：注册、发现、高可用实验
       客户端负载均衡：针对双实例服务
       熔断/降级：具体跨服务调用处
       MyBatis + MySQL：各服务仅访问自己拥有的数据
```

### 4.1 模块建议

| Java 模块 | 职责 | 对应原文件 | 数据归属建议 |
|---|---|---|---|
| `eureka-server` | Eureka 注册中心，以两个进程/实例运行 | 新建 | 无 |
| `gateway-service` | 统一 `/api`，路由转发、跨域、统一安全边界 | `server/index.js` 的入口职责 | 无 |
| `user-service` | 登录、用户/人员、角色、会话、车辆资料 | `routes/auth.js`, `profiles.js`, `admin.js`的人员部分, `middleware/auth.js`, `lib/passwords.js` | users/people/roles/role_profiles/sessions/vehicles |
| `appointment-service` | 预约增查、被访人及保卫处审批、状态机 | `routes/appointments.js` | appointments |
| `access-service` | QR 凭证、门岗核验、通行记录、设备、校门规则 | `routes/accessRecords.js`, `credentials.js`的QR部分, `devices.js`, `lib/accessPolicy.js` | qr_codes/access_records/gates/devices/access_rules |
| `exception-service` | 异常事件、黑名单、处置记录、基础异常分析 | `routes/exceptions.js`, `lib/blacklist.js`, `lib/exceptionAgent.js` | exceptions/blacklist |
| `campus-common` | 通用响应、错误码、DTO（不得复制共享持久化 Entity） | `lib/http.js`, 部分 validators | 无 |

**须再明确分配**：`faces`、`settings`、`logs`、`messages`、`dashboard.js`、`reports.js`、以及 `admin.js` 和 `credentials.js` 剩余接口；建议 `faces` 属于 user-service（若保留）、配置归 user/access 业务域、日志由相应服务记录并提供管理员聚合接口、消息归 user-service 或独立子模块；Dashboard/Report 初期采用网关路由至单个聚合API或应用层读取其他服务的统计API，避免跨服务共享表。

### 4.2 数据边界原则

第一期可使用**同一 MySQL 实例**，但最好分 schema（例如 `campus_user`, `campus_appointment`, `campus_access`, `campus_exception`）；如果为了降低难度仍用一个 schema，也要通过数据库用户权限/Mapper 访问规则明确归属，**禁止一个微服务直接查询其他服务业务表**。跨服务的数据关联用 ID + API 解释，不建立无法独立治理的跨库外键；每个服务自身使用 `@Transactional`。跨服务流程使用状态机、幂等操作、失败重试/补偿，绝不声称跨服务事务天然原子化。

## 5. 目标代码目录

```text
campus-access-system/
├─ frontend/                     # 迁移/保留原 src、public、配置等
├─ backend/
│  ├─ pom.xml                     # Maven 父 POM + BOM 版本管理
│  ├─ campus-common/
│  ├─ eureka-server/
│  ├─ gateway-service/
│  ├─ user-service/
│  ├─ appointment-service/
│  ├─ access-service/
│  └─ exception-service/
├─ database/
│  ├─ 00-legacy-schema.sql
│  ├─ migration/                 # 可重复、可审计的增量脚本
│  └─ seed/                      # 脱敏演示数据
├─ docs/
│  ├─ current-system-audit.md
│  ├─ api-inventory.csv
│  ├─ api-contract.md
│  ├─ compatibility-decision.md
│  ├─ service-boundaries.md
│  ├─ database-migration.md
│  ├─ test-evidence.md
│  └─ report-materials/
└─ README.md
```

每个业务服务采用 Spring Boot 主启动类及 `controller/`, `service/`, `service/impl/`, `dao/`, `entity/`, `dto/`, `client/`, `config/`, `resources/mapper/`；`@Mapper` + MyBatis XML 或注解 SQL，优先使用可清楚展示给老师的 Mapper XML。保留 `entity` 为本服务的表结构类，不将其跨服务共享。公共模块只存响应结构、必要枚举/跨服务 DTO 和工具。

## 6. API 兼容规范（Codex 必须先盘点）

### 6.1 明确的原始 API 路由清单（除特别声明均在 `/api` 下）

| 来源文件 | 路径及方法示例/全集 |
|---|---|
| `auth.js` | `GET /roles`; `POST /auth/login`, `/auth/send-code`, `/auth/reset-code`, `/auth/reset-password`, `/auth/register-visitor`, `/auth/logout`; `GET /auth/me`; `PATCH /auth/password` |
| `appointments.js` | `GET /appointments`, `/appointments/hosts`, `/appointments/:id`; `POST /appointments`; `PATCH /appointments/:id/review` |
| `accessRecords.js` | `GET /access-records`; `POST /access-records`, `/access-records/simulate` |
| `credentials.js` | `GET /faces`, `/vehicles`, `/qr-codes`; `POST /faces/upload`, `/vehicles`, `/qr-codes`, `/qr-codes/:id/verify`; `PATCH /vehicles/:id`; `DELETE /vehicles/:id` |
| `devices.js` | `GET /devices`; `POST /devices`; `PATCH`、`DELETE /devices/:id` |
| `exceptions.js` | `GET /exceptions`, `/exceptions/analysis`, `/exceptions/:id/analysis`, `/exceptions/:id`; `POST /exceptions/chat`, `/exceptions/:id/actions`; `PATCH /exceptions/:id` |
| `profiles.js` | `GET /profiles/me`, `/profiles/:role`; `PATCH /profiles/me`, `/profiles/:role` |
| `admin.js` | `GET /people`, `/people/:id`, `/users`; `POST /people`, `/users`; `PATCH /people/:id`, `/users/:id`; `DELETE /people/:id` |
| `dashboard.js` | `GET /dashboard/admin`, `/dashboard/:role` |
| `reports.js` | `GET /reports/summary`, `/reports/access` |
| `settings.js` | messages、gates、access-rules、blacklist、logs 一组路由，详见原文件的 `router.get/post/patch/delete` |
| `server/index.js` | `GET /health`（实际 `/api/health`） |

**注意**：以上是静态提取的路由声明，不是完整字段契约。Codex 须进一步从路由、`src/api/client.js`、页面调用点生成 `api-inventory.csv`，逐接口记录查询参数、请求体、响应字段、状态码、权限角色、服务归属、是否已迁移、测试编号。特别检查路由匹配顺序（例如 `/appointments/hosts` 应在 `/:id` 之前）。

### 6.2 统一响应与前端接入

```json
{ "success": true, "data": { "id": "..." } }
```

```json
{ "success": false, "error": { "message": "业务提示", "details": null } }
```

必须支持原有 Bearer Token；在未改造前端持久化机制的第一阶段可保持 `campus_token` / `campus_session` 的读取行为。不要直接相信前端提交的 `userId` 或 `role`；后端以已认证用户决定可见数据。401 清理会话，403 拒绝越权。对于错误映射、时间格式、空值、列表顺序、额外 `meta` 等，做契约测试，避免页面隐式破坏。

## 7. 核心业务状态机与安全要求

### 7.1 预约

保留原有中文状态：`待审核`（历史兼容）、`待被访人审核`、`待保卫处审核`、`已通过`、`未通过`。由访客创建 → 被访人审核 → 保卫处审核 → 成功才签发二维码。应记录 `reviewerId/reviewedAt/decision/reason`；拒绝路径不得出凭证。并发双击审批只能生效一次，使用版本号/条件更新或行锁。原代码允许 `student/teacher/admin` 作为被访人候选，请按照现有角色约束核实。

### 7.2 QR、校门通行与异常

二维码必须绑定合法业务主体与有效期；门岗模拟核验时检查签发状态、有效期、黑名单、时间窗口、通行方向、门禁规则，拒绝时记录原因。二维码不得随意明文包含身份证号等敏感个人资料。重复扫码、并发请求保证幂等或按明确的重入规则处理。拒绝可创建异常事件；同一业务事件避免生成无限重复异常记录。现有“模拟核验”必须清楚标识为模拟。

### 7.3 用户与权限

用安全密码哈希，令牌随机性足够并在数据库端安全存储（可优先仅存令牌摘要）；配置 Token 过期、登出、禁用账号。六类角色的后端权限根据原 `middleware/auth.js` 整理成权限矩阵，添加越权测试。敏感日志不得打印密码、验证码、Token、证件号码原文。密码重置/短信发送如果只提供本地演示，必须在界面和报告中明确说明，不伪装真实短信能力。

## 8. 服务间调用与故障处理（真实调用，不做空壳）

建议至少实现三条调用：

1. `appointment-service → user-service`：创建预约时查找被访人、校验其身份和状态；用户服务至少双实例部署，用于注册发现及负载均衡演示。
2. `access-service → appointment-service`：核验访客二维码时检查预约最终审核状态与有效期。
3. `access-service → exception-service`：拒绝通行时创建异常事件；失败应记录待补偿任务或显式告警，不可造成“拒绝但未记录”而完全静默。

可以由 `appointment-service → access-service` 签发二维码，但必须处理审批通过后调用失败的情况：状态可先标记为 `已通过/凭证待生成`，设置唯一幂等键并补偿重试；不可因网络异常重复签发凭证。

**OpenFeign 模式**：消费者以 `@FeignClient(name="user-service")` 声明接口，接口上的 HTTP 方法/路径/参数绑定必须和提供者 Controller 契约一致；消费者启动类启用 Feign 扫描；接口调用实际通过 Eureka 解析实例及客户端负载均衡，而不是全部硬编码 `localhost`。对于旧版路线依照对应依赖正确接入 Ribbon、Hystrix；新版路线依照已批准的替代组件实现。

**熔断降级示例**：用户服务不可用时，“创建新预约”不能无条件继续成功，应返回可读的暂不可用提示或明确的待处理状态；对只读查询可以按规则返回缓存，但不能伪造被访人存在。故障恢复后必须验证服务可以继续被访问。

## 9. 数据库迁移规范

1. 备份原数据库/导出 SQL，保留原 `schema.sql` 与 `seed.js`；迁移脚本**只能增量可追溯执行**。
2. 逐表核对主键、唯一约束、索引、时间类型、JSON 字段、枚举和历史数据；先建立字段映射与数据字典。禁止未经验证直接把所有字符串时间列改成 DATETIME。
3. MyBatis：每张核心表至少有相应 `Entity + Mapper + Mapper.xml + Service`；核心实体至少支持增/查/改（符合业务者实现删），展示参数化 SQL 与事务。
4. `getData/updateData` 全局快照与串行写队列不得复制到各服务；服务内做数据库行级读写与事务，并发变更用条件 UPDATE/乐观锁/唯一键。
5. 保持原 ID 格式与前端显示兼容；需要改 ID 时定义单独映射机制，不悄悄重编号。
6. 账号密码/Session 迁移必须保证安全；演示数据脱敏，真实敏感信息不可进入版本库。
7. 迁移后执行表总数、每表行数、抽样字段、外键/关联、历史预约状态、历史二维码与通行记录核对，并存结果。

## 10. 推荐实施顺序：每阶段单独提交、验证后才继续

### P0 盘点与备份（严禁改业务）

**工作**：识别真正仓库根；列出模块、所有前端 API、路由、数据库表/字段、权限矩阵、演示账号/依赖（不要把密码输出到报告）；记录现有测试/运行环境和已知异常；备份数据。

**产物**：`docs/current-system-audit.md`、`docs/api-inventory.csv`、`docs/database-migration.md` 初稿、`docs/acceptance-checklist.md`；只读分析，不改现有功能。

**验收**：API 与路由覆盖完整，18 表全部映射，六类角色均有清单。

### P1 兼容性验证和最小可运行技术底座

**工作**：输出双路线对比、确定需要老师确认的事项；用独立最小工程验证 JDK/Maven/Boot/Cloud/Eureka/Feign/Gateway/负载均衡/熔断兼容；确认后创建 Maven 多模块，搭建两个 Eureka Server、Gateway 和健康检查用户服务。

**验收**：两个 Eureka 节点实际启动、注册页面/查询可见、单个业务 Java 服务通过 Gateway 访问；保留启动命令与实际日志。

### P2 用户服务与登录安全

**工作**：迁移用户、人员、角色、会话、车辆基本数据；实现 Java 登录、登出、当前用户、注册、修改密码；最小先实现原前端关键接口；用 MockMvc 与真实 MySQL 双层测试权限。

**验收**：学生/教职工/访客/校友/门岗/管理员均能以演示账号登录并访问对应页面；无权限返回 403；登录过期返回 401。

### P3 预约服务及首次 OpenFeign 调用

**工作**：实体、Mapper XML、Service、Controller、Feign Client；实现全部预约查询/创建/两阶段审核；通过用户服务核实被访人；保留原路径和状态字段。

**验收**：访客提交→被访人通过→保卫处通过；拒绝流程；越权拒绝；下游服务停机不虚假通过；数据库真实落库。

### P4 通行服务与异常服务

**工作**：二维码、校门规则、设备、通行记录及模拟核验、异常创建处理、黑名单；业务ID稳定、跨服务幂等与失败恢复；最后接回统计/消息/驾驶舱等接口。

**验收**：成功/拒绝核验均形成可查询记录；异常事件能跟踪；核心React页面无破损；未迁移次要功能标明待办。

### P5 负载均衡、熔断与网关验证

**工作**：双实例 `user-service`（不同端口）注册；真实调用观察流量分配；配置合适的熔断触发/恢复；证明 Gateway 统一入口；避免仅凭“配置写了”就算实现。

**验收证据**：服务列表及双实例、调用实例身份日志（不暴露敏感数据）、实例故障、熔断/降级结果、恢复结果、Gateway 路由访问、数据库状态。

### P6 前后端联调、报告与答辩

**工作**：修改 Vite 代理的后端指向 Gateway；只在必须时调整 `src/api/client.js`；全角色回归、Maven测试、Vite build；整理部署指南、API清单、实体图、顺序图、测试材料；更新课程设计报告。

**验收**：Java 后端独立提供业务；**关闭原 `server/index.js` 后前端核心功能仍可用**。5分钟演示准备完成；报告技术组件描述和实际代码一致。

## 11. 自动化和手工测试清单

| 编号 | 用例 | 期待结果 |
|---|---|---|
| T01 | 六角色登录/退出/过期/禁用账号 | 身份正确；失效返回401，禁用账号拒绝 |
| T02 | 学生请求管理员接口 | 403且不泄漏用户数据 |
| T03 | 访客提交预约 | 正确创建待被访人审核记录 |
| T04 | 被访人批准→保卫处批准 | 最终批准并产生可用凭证，审计完整 |
| T05 | 越权审核与重复审批 | 请求拒绝或幂等，不重复产生二维码 |
| T06 | 凭证过期/黑名单/错误校门/时间窗口 | 拒绝并保留明确记录 |
| T07 | 正常校门核验 | 保存通行记录、可在前端查询 |
| T08 | 异常核验 | 按规则创建异常，避免重复事件 |
| T09 | 注册中心双节点 | 各节点启动、注册发现可验证 |
| T10 | 用户服务双实例负载均衡 | 多次请求在两个实例间分配，有真实请求证据 |
| T11 | 关闭下游提供者 | 发生预期超时/熔断/降级，不产生错误业务提交 |
| T12 | 恢复下游提供者 | 熔断器恢复后业务正常 |
| T13 | 前端仅通过Gateway调用 | 无直接连Node单体；核心页面正常 |
| T14 | MyBatis持久化与并发测试 | 刷新后数据不丢失；并发审批/核验符合规则 |
| T15 | 错误处理 | 400/401/403/404/409/500类错误均能被前端识别 |
| T16 | 构建与重启 | `mvn test`、Java启动、`npm run build` 可重复成功 |

以上为目标用例，绝对不得把“计划用例”写成“已经通过”。未通过时记录问题与整改计划。

## 12. 课程设计报告同步产出规范

**2.1 系统设计报告**：背景/目标；六类用户与权限；系统总体功能结构；访客预约、校门核验、异常处置流程；微服务总体架构图；类概念/物理模型；至少两张关键业务顺序图；数据库逻辑结构和物理表设计（至少5表，建议覆盖现有18表并说明合理归属）。

**2.2 系统开发报告**：环境和兼容性决策；Maven多模块目录和分层；Eureka 双实例、高可用说明；客户端负载均衡配置、验证；Feign接口及消费端/提供端代码；熔断触发、fallback和恢复；Gateway路由、断言、过滤器；MyBatis 单实体CRUD与数据关系设计；真实运行结果及测试证据。

**课程设计日志**：每两次上机记录一次时间、目标、完成文件/类与方法、运行验证、遇到问题与下一步。不生成虚假日期/上机签到或编造教师批语。

**5分钟现场演示建议**：① 30秒总体架构及服务注册；② 1分钟访客登录并创建预约；③ 1分钟两阶段审批与扫码模拟；④ 1分钟服务发现及双实例负载均衡；⑤ 1分钟断开服务触发降级及恢复；⑥ 30秒Gateway/MyBatis/异常记录。实际顺序依运行稳定性调整。

## 13. Codex 交付标准（每阶段都遵守）

Codex 每完成一个阶段，必须提交：

1. 本阶段新增/修改的文件清单和关键设计决定。
2. 实际运行过的命令（在当前机器无法运行时明确写原因），每条命令的成功/失败结果。
3. 测试覆盖的路由、角色、数据表和技术组件；未测试/未实现项目明确列出。
4. 对现有 React 的兼容性影响与需要调整之处。
5. 是否满足本阶段验收条件；不满足不能直接跳到下一阶段。
6. 更新 `docs/migration-progress.md`，其中区分 **已实现 / 已运行 / 已测试通过** 三种状态。

安全限制：不能将 `.env`、数据库真实密码、演示账号口令、Token、个人敏感数据、`node_modules`、`dist`、日志、IDE状态文件提交至仓库；使用 `.env.example` 提供变量名和无敏感默认样例。

## 14. 可直接粘贴给 Codex 的“总指令”

```text
你现在负责把现有校园出入管理系统从 React + Express + MySQL 迁移到 Java Spring Boot + Spring Cloud + MyBatis 分布式微服务。请先完整阅读仓库代码，尤其是 server/index.js、server/routes/*、server/middleware/auth.js、server/lib/store.js、server/db/schema.sql、src/api/client.js、src/config/roles.js；同时阅读本仓库《Codex_智慧校园出入管理系统_Java微服务改造实施说明.md》。

约束：不得推倒重做React界面；保持六角色、原前端主要API契约、两阶段审核与校门核验模拟；不得删库、覆盖原仓库、泄漏敏感数据；不能以Java空工程或保留Express提供业务冒充迁移完成。

先只执行P0：输出当前系统审计、完整API清单、18张表的归属方案、六角色权限矩阵、风险和技术版本冲突问题；不要写Java代码或进行破坏性修改。待我验收后再执行P1。老师的旧版Ribbon/Hystrix要求与课件较新的Boot版本存在兼容疑点，不得猜测版本；必须先研究并验证同一套兼容组合，并提出供我确认的两个路线。

每阶段完成时：列出修改文件、真实执行的测试命令、成功/失败证据、未完成项目；任何未测试的功能不得标为通过。必须一次只推进一个阶段，等待我的下一条明确指令。
```

### 后续阶段命令模板

```text
现在按照改造说明执行 P{阶段编号}，仅修改这个阶段必要的文件。执行前先复述本阶段输入、变更范围和验收标准；完成后运行可运行的自动化测试，输出修改文件清单、测试结果、遗留风险，更新 docs/migration-progress.md。若技术组件出现版本不兼容，不得用没有依据的依赖或占位代码绕过，应暂停并说明阻塞点。
```

## 15. 开工前的最终核对

- [ ] 已保存一份可恢复的原项目与数据库备份。
- [ ] 真实 Git 仓库根目录已确认，排除 `node_modules` 等构建产物。
- [ ] 已生成前端 API 与 Express 路由对照表、18表关系与六角色权限矩阵。
- [ ] 老师是否强制Ribbon/Hystrix已确认，或清楚记录为版本阻塞项。
- [ ] Java技术底座已在本机真实启动后才开始批量迁移业务。
- [ ] 服务之间通过 API 协作，不直接跨服务读写其他服务的数据表。
- [ ] Java Gateway 已替代 Express 为前端提供统一 `/api`；原Node API停止运行后业务仍可使用。
- [ ] 报告中的截图、日志和测试结果均来自真实运行。

---

**本文件按上传项目当前静态源代码、课程任务书和评分标准编制。版本兼容性、环境状态及具体行为仍需在 Codex 实施阶段逐项验证。**
