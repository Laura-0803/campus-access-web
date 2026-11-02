# 课程报告整编提纲与图稿

依据真实任务书与评分标准的只读提取：[任务书](p5-evidence/course-task.txt)、[评分标准](p5-evidence/course-rubric.txt)、[原件路径与SHA256](p5-evidence/course-sources.json)。这是可整编的内容提纲与源码图稿，不是已提交的Word终稿或教师签署材料。

## 软件开发日志（20%评分材料）

按本人真实每两次上机时间编写一篇：本次目标、实际修改类/方法及作用、构建与运行、失败和修正、下次计划。使用P0–P7阶段报告与原始日志作为事实来源；机器执行时间不能冒充到课时间。姓名、学号、班级、实际签到、按时提交情况由本人填写；没有证据的事项保持空白。

## 系统设计报告（报告部分的20%）

1. 背景、六角色与功能范围：校园人员、访客两阶段预约、凭证核验、异常处置、统计；明确禁用删除/无绑定/HOLD限制。
2. 总体结构：原React + Gateway + 四业务域 + 只读聚合 + 双Eureka；各域独立MySQL账号/Schema。
3. 前后台业务流程：注册登录、被访人审核、保卫处批准、真实QR、幂等核验、异常风险及处置。
4. 概念模型、逻辑结构与物理设计：至少选择users/people/sessions/appointments/qr_codes/access_records/exceptions/blacklist，逐字段填写中文名、字段名、类型/长度、小数、主键、索引、备注。原[数据字典](database-dictionary.md)与本轮真实database-audit分别是原库及Java隔离库事实，不能混用DDL。
5. UML概念类关系、主要顺序图、错误边界：明确关系ID与物理FK区别。

### 图1：功能结构

```mermaid
flowchart TD
  S[校园出入管理] --> U[认证与人员档案]
  S --> A[预约及两阶段审核]
  S --> C[二维码 校门设备 通行记录]
  S --> E[异常 风险 黑名单 处置]
  S --> R[首页和统计报表]
  U --> P[六角色 服务端权限 会话撤销]
  A --> I[真实凭证签发及持久恢复]
  C --> V[安全拒绝 幂等核验 可靠事件]
  E --> H[单向处置状态机及审计]
```

### 图2：当前微服务架构

```mermaid
flowchart LR
  UI[React 15173] --> G[Gateway 19800]
  G --> U[user-service 双实例]
  G --> A[appointment-service]
  G --> C[access-service]
  G --> E[exception-service 双实例]
  G --> R[aggregation-service]
  R --> U
  R --> A
  R --> C
  R --> E
  A --> U
  A --> E
  A --> C
  C --> U
  C --> E
  C --> A
  E --> U
  U --> E
  U --> DU[(用户库)]
  A --> DA[(预约库)]
  C --> DC[(通行库)]
  E --> DE[(异常库)]
  G -. 发现 .-> ER[Eureka 19761 与 19762]
  U -. 注册 .-> ER
  A -. 注册 .-> ER
  C -. 注册 .-> ER
  E -. 注册 .-> ER
  R -. 注册 .-> ER
```

箭头包含既有按需回调，A/C之间使用受保护决策查询，不是在同一请求递归签发；U/E黑名单和审计分别调用不同职责，禁止用图中的双向依赖声称不存在耦合。聚合不连数据库；旧Express只保留源码，不运行。

### 图3：主业务流程

```mermaid
flowchart TD
  L[合成访客登录] --> B{黑名单及身份可确认}
  B -- 否 --> D[安全拒绝及原错误包装]
  B -- 是 --> A[创建 待被访人审核]
  A --> H{被访人本人审核}
  H -- 拒绝 --> N[未通过]
  H -- 通过 --> S[待保卫处审核]
  S --> F{保卫处审批}
  F -- 拒绝 --> N
  F -- 通过且人员已绑定 --> O[持久签发操作及幂等命令]
  O --> Q{真实凭证激活结果确认}
  Q -- 未确认 --> X[503 持久自动恢复 不伪报失败或成功]
  Q -- 确认成功 --> K[200 appointment 与真实 qrCode]
  K --> V{Java通行核验}
  V -- 允许 --> R[真实正常记录]
  V -- 拒绝 --> T[拒绝记录 按规则输出事件]
  T --> E[异常服务去重接收 风险分级 处置]
```

### 图4：概念关系（不是跨库物理外键）

```mermaid
erDiagram
  PEOPLE ||--o{ USERS : linked_person
  USERS ||--o{ SESSIONS : owns
  PEOPLE ||--o{ VEHICLES : owns
  PEOPLE ||--o{ FACES : owns
  PEOPLE ||--o{ APPOINTMENTS : visitor_or_host
  APPOINTMENTS ||--o| QR_CODES : unique_appointment
  PEOPLE ||--o{ ACCESS_RECORDS : identified_person
  ACCESS_RECORDS ||--o| EXCEPTIONS : event_when_required
```

users.person_id与sessions.user_id在用户库有实际FK；预约、QR、通行、异常之间的ID是逻辑关联，通过内部API/幂等约束维护。roles是角色字典，users.role为单个角色键；不能虚构已实现的多角色RBAC关联表。规则的角色/校门/核验方法组合以字段/JSON表达，没有独立多对多嵌套resultMap代码。MyBatis单实体真实完成；一对多、多对多在设计说明中据实解释，若教师坚持额外代码示例需另行批准。

### 图5：最终审批及核验核心顺序

```mermaid
sequenceDiagram
  participant UI as 原React
  participant G as Gateway
  participant A as Appointment
  participant U as User
  participant C as Access
  participant E as Exception
  UI->>G: PATCH appointments/id/review
  G->>A: 原Bearer与请求
  A->>U: 实时账号角色和人员校验
  A->>A: 条件更新 持久操作 审批决策
  A->>C: 幂等prepare及activate命令
  C->>A: 受保护决策确认
  C->>C: 唯一预约约束 安全随机Token 持久QR
  C-->>A: 可查询真实签发结果
  alt 结果已确认成功
    A->>A: 持久确认成功
    A-->>UI: 200 appointment及qrCode
  else 超时或回执未知
    A-->>UI: 503原错误包装
    A->>A: 后台按实时权限与操作状态恢复
  end
  UI->>G: POST access-records/simulate及幂等键
  G->>C: 实际核验
  C->>U: 身份状态确认
  C->>A: 预约授权确认
  C->>E: 黑名单真实查询
  C->>C: 事务核验 记录 幂等响应 Outbox
  C->>E: 按业务触发事件 重试及去重接收
  C-->>UI: allowed与真实record
```

以上是协议级顺序摘要，不把网络调用包进一个全局事务；具体持久状态/故障补偿见[p4-qr-issuance-design.md](p4-qr-issuance-design.md)及[p4-qr-consistency-test.md](p4-qr-consistency-test.md)。

## 系统开发报告（报告部分的80%）

1. 开发环境与兼容决策：Java11独立环境、Boot/Cloud BOM，旧Ribbon/Hystrix真实Maven及P1实验，不用网上推断代替运行。
2. 创建Eureka双节点与peer配置，展示注册和单节点恢复证据，说明单机HA局限。
3. Ribbon服务列表/过滤链与RoundRobin：引用P1诊断及P6/P7双实例实际计数。
4. OpenFeign各Client、内部服务认证、超时与DTO/Map响应；解释没有硬编码业务实例地址。
5. Hystrix真实错误、短路、开路及探测恢复；fallback不是开路证据，统计失败不能返回假零。
6. Gateway配置及身份头清理、P6无Express兜底、删除禁用、未知签发503保护。
7. 四业务域按Controller→Service接口/Impl→DAO→Entity/DTO→Mapper XML逐个说明类和主要方法；不要整段粘贴全部源码。聚合无持久化，不强造DAO。
8. MyBatis参数化SQL、域内事务、乐观/条件更新、唯一约束、Outbox/Inbox和幂等键；真实回滚/并发证据。
9. 68 API对照、六角色范围、React可操作入口与脚本接口区别，已批准契约差异单列。
10. 测试、失败日志与修正、原数据/备份保全、风险、课程建议与本人心得。不得把未实现限制写成已完成。

建议附录：最终API矩阵、物理字段/索引清单、版本依赖、构建日志、脱敏截图、5分钟脚本。统一图号/表号和参考文献由正式排版阶段完成，本轮不冒称终稿已验收。
