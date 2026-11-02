<!-- P6-CURRENT-BEGIN -->
## 当前P6边界（2026-10-20，隔离验收提交）

新增独立aggregation-service，仅按受保护Feign接口读取四域，拥有零业务表、无DataSource；dashboard/reports不再放user-service或Express。user-service唯一业务修改为LegacyClient服务名改exception-service，其余原认证/权限/CRUD不变。Gateway P6精确路由五API且无Express兜底，Health通过独立内部网关就绪接口及四域真实SQL探测，不递归调用自身Health。

原68 API为67 Java、0 Express、1人员删除禁用。原四库归属及API契约除批准Health外不变；Feign目标调整不改变黑名单协议。聚合为多时点组合，不是全局事务快照。Express源码与旧隔离模式保留，无正式切换。P6范围/证据见[p6-acceptance.md](p6-acceptance.md)。下列P5/P4“依赖桥/聚合位于user”均为历史方案，以本段为当前边界。
<!-- P6-CURRENT-END -->

<!-- P5-CURRENT-BEGIN -->
## 当前P5前置分析与集成准备（2026-10-20，待下一次审批）

P4-C已获用户阶段验收。P5仅分析和隔离集成核查：原68API中Java62、Express5（四聚合+health）、未实现1（人员删除）；Java覆盖91.18%，不是总体/页面完成率。统一启停/健康检查与本轮436项真实集成断言通过，React/Java业务源码不变，原68文件、19原表和备份不变，既有HOLD不变。A–F只出方案，未改UI/契约、未进入正式切换或下一阶段。见[p5-system-integration-audit.md](p5-system-integration-audit.md)。以下较早阶段状态作历史保留。

<!-- P5-CURRENT-END -->

<!-- P4C-CURRENT-BEGIN -->
## 当前P4-C状态（2026-10-20，等待验收）

用户已批准P4-A/B此前范围及P4-C实施、A+B安全差异。独立exception-service和10条原API已实现、编译、注册、Gateway及真实SQL/HTTP/Edge验证，共496项断言。异常/黑名单归独立库；预约/通行按Eureka+Feign/Ribbon查询正式异常服务；事件幂等inbox及原access_outbox续投，审计独立outbox。旧桥接仅聚合与P2注册黑名单代理，无名单缓存或异常写入。非法时间拒绝，处置单向且成功同键重放200。原68文件、19表及备份不变，测试进程已关闭，未进入后续阶段。见[p4c-acceptance.md](p4c-acceptance.md)。以下历史阶段状态不代表当前授权。

<!-- P4C-CURRENT-END -->

<!-- P4-CURRENT-BEGIN -->
## 当前P4状态（2026-10-19，等待审核）

P4-A独立access-service及15条原API已实现、编译、启动并真实验证。P4-B已绑定人员真实签发闭环已完成隔离复验；未知503与确认后重放200按已批准契约执行。最终构建build-9，399项真实断言通过。未绑定人员最终审批仍503保护，原页面缺失扫码/规则验证入口未补写，详见[p4-acceptance.md](p4-acceptance.md)。P4-C仅分析，人员删除未实施。原系统及备份校验一致，本轮进程已关闭；没有正式切流或进入后续阶段。以下较早阶段内容保留作历史记录，以本段及各阶段真实证据判定当前状态。

<!-- P4-CURRENT-END -->

# 微服务拆分方案（设计草案，未实施）

P1补充：独立experiments/p1-legacy-lab四模块已完成Ribbon分流、Hystrix熔断恢复、Eureka故障恢复、Gateway/Feign和MyBatis实验验证。它们只提供合成接口/实验MySQL，不代表下面正式业务域已实现。原数据归属和68API边界未改；当前等待P1审核，不开始P2。

保留原React、URL、JSON、中文状态和显示顺序。Gateway保持 `/api/**`，认证后调用领域服务；领域服务也验证可信身份，不能信任任意客户端X-User头。HTTP业务响应仍为统一包装。网关无需持久化业务表；campus-common只放响应/错误/DTO/枚举，不共享Entity/Mapper。

|模块|数据独占归属|原接口/职责|
|---|---|---|
|eureka-server×2|无|两个独立进程，互注册/故障演示；不能只开两个页面|
|gateway-service|无|health、路由、CORS、身份边界、统一入口；不要引入业务数据库|
|user-service|roles、role_profiles、users、people、sessions、vehicles、faces、messages、logs|auth、profiles、admin人员/账号、车辆、人脸、公告；附应用聚合模块承接dashboard/reports/logs查询|
|appointment-service|appointments|创建/候选被访人/列表/两级审批，review状态与审计|
|access-service|access_records、qr_codes、devices、settings、gates、access_rules|通行、扫码模拟、QR、设备/校门/规则；settings现有门禁参数全部留在此域|
|exception-service|exceptions、blacklist|异常列表/分析/对话/门岗处置、黑名单；本地规则分析继续保留基础能力|
|campus-common|无|跨服务DTO、错误协议；不包含原store的全量快照|

18表分配9+1+6+2，全部唯一归属。历史app_state为归档迁移资产，未分给运行时服务；禁止各服务继续读它。logs初期归user审计子模块（不是所有服务直接插表）：各服务本地事务记录待发送事件，幂等发送到内部审计API，查询统一聚合；敏感凭证脱敏。若后续独立审计服务需另行批准，P0不新增第五业务服务。

dashboard/reports 放user-service内应用聚合层，调用各服务“按身份/校门/日期”内部统计API，禁止通过user Mapper读取另外三域表。角色个人记录/异常仍由原dashboard响应返回。聚合失败应明确错误或可识别的不完整数据，不能把失败伪装成真实零值。user服务内部直接调用自身业务层，避免向自己Feign递归；预约/通行不调用聚合层，避免环路。

## 真实调用与数据一致性

1. appointment→user：被访人候选/身份/状态；Feign按服务名经Eureka发现，user双实例验证负载均衡。失败拒绝新提交或明确待处理，不能虚构用户存在。
2. appointment→exception：提交和审批检查生效黑名单；无可用结果时安全失败，不能跳过拦截。
3. appointment→access：最终批准后签发QR，appointmentId为幂等键；本地批准+outbox持久化，签发失败进入可追踪的凭证待生成状态/重试。对外原status保持中文契约，附加字段须契约评审。
4. access→appointment：验证访客QR最终批准状态、有效时段；access→user检查人员/账号状态、车辆和人脸“已上传”元数据，personCode也由ID解析或受控快照补齐。
5. access→exception：黑名单查询、拒绝创建异常；本地拒绝记录与outbox同事务，eventId唯一去重，发送失败保留待补偿任务并可查。成功车牌更新时间通过user幂等API。
6. user聚合→appointment/access/exception：驾驶舱/报表；各服务审计事件→user内部审计API，不反向调用聚合层。

每服务controller/service/service/impl/dao/entity/dto/client/config + resources/mapper，优先XML参数化SQL。MyBatis核心实体CRUD体现真实数据库行操作，事务只承诺本服务内原子性。不能把Express全局串行队列复制成多个缓存。

第一期同MySQL实例分4 schema（或明确表权限的同schema）；跨域引用保留原ID、不保留跨库FK。删除人员跨域清理QR/预约关联需要审计、补偿并保留历史记录；当前原路由级联删除行为与FK SET NULL不完全相同，P2/P4必须定义和测试，不能静默改变。

熔断位置优先appointment→user：下游停止后出现可读错误，数据库不误创建预约；恢复后再次成功。网关采用Reactive栈独立模块，不能把MVC starter错误地加入同一个Gateway应用。全部组件实际版本、JDK与MyBatis starter在P1依赖树及启动实验后锁定。


## P3 (2026-10-19)

P3: appointment-service owns appointments, appointment_review_history and appointment_outbox only. User identity/people via protected Feign; blacklist via isolated Express HTTP; audit via protected user-service endpoint. Final approval is rejected without committing until P4 provides real issuance. Personnel deletion remains disabled. See p3-appointment-service-design.md.
