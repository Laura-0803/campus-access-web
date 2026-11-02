# P6 契约与隐藏依赖审查（A+B已批准实施）

2026-10-20。用户已明确批准A+B，并要求Health分别验证Gateway与四业务服务。以下原行为及建议文本作为审批沿革保留，其中“待批准/尚未应用”描述的是提交方案时点，当前已实现。最终53项静态数据窗口HTTP/SQL对照与原Express一致，包含鉴权错误包装及文案；Health按批准差异实施，不宣称原单库语义完全兼容。

## 当前实际差异及证据

Health URL/Method/包装/service/status不变；store.type="distributed-mysql-relational"，host/port/database/legacyTable/user及dataFile为null，tables为18个真实领域表名。五组件分别进行真实检查，失败503，读取阻塞实测1635ms后503，恢复后200。服务忙时也503。Gateway新增仅内部密钥可访问的就绪接口，不暴露数据库或凭据。见[faults](p6-evidence/faults-1792507777204.json)及[真实SQL超时](p6-evidence/read-timeout-1792507936603.json)。

LegacyClient仅服务名改为exception-service，实际POST /internal/blacklist-check，body.credential与available/blocked/reason保持兼容。真实注册、管理员创建访客、黑名单命中、异常服务全停及真实开路后安全拒绝、恢复后写库均已测试。当前user内部components仍有旧legacy诊断名，未借此扩大业务源码修改；它不发出黑名单业务调用。

受控两次冷启动浏览器最终审批503为原批准的“结果未知”，不是新契约。两项持久操作自动恢复为SUCCEEDED，重复请求200返回同一有效码，未编辑操作状态，详见[cold-start-recovery](p6-evidence/cold-start-recovery.json)。保留失败浏览器报告，不能把这些首次503标成正常同步200。

## A：health的单库语义无法原样真实保留

原index.js公开GET /api/health返回success/data，data为service="campus-access-api"、status="ok"、store和dataFile。store真实来自单库配置，含type="mysql-relational"、host、port、database、legacyTable、tables、user；dataFile是带账号/主机/库名的mysql://描述字符串。

当前隔离桥增加Gateway内部访问校验，store指向过渡库；P4-C tableMap为空，因此桥的tables为[]。这不等同原19表，也不表示四Java业务库的健康。无数据库的聚合层既不能声称自己仍连接该过渡库，也不能用常量拼出旧数据位置。停桥后继续返回旧配置会虚报。

建议A（待批准）：保留GET路径、公开健康性质、success/data包装及data.service/status。成功HTTP200仅在四个Java提供者的受保护查询均真实成功后返回；下游故障HTTP503原错误包装，不返回ok。store仍保留原键，但type改为"distributed-mysql-relational"；host/port/database/legacyTable/user为null；tables为四域实际拥有的18个业务表名列表（不包含历史app_state），dataFile为null。响应不包含真实库账号/网络位置。

明确差异：store.type值变化，原store位置字段及dataFile从非空配置值改为null，tables不再描述单库；不能宣称原字段值/空值语义完全兼容。前端当前无health业务调用，但这不能替代用户批准。待批准前暂停health实现及路由切换。若要求完全保留旧非空值，需另定真实语义，不能伪造单库。

## B：用户域仍依赖Express黑名单代理

静态调用链：AuthServiceImpl.checkBlacklist及AdminServiceImpl.blacklist → LegacyClient（@FeignClient(name="legacy-bridge")）→ 桥/internal/blacklist-check → exception-service同路径。即使五条公开API全Java化，停桥后访客注册、创建/部分修改访客仍会503。

建议B（待批准，最小现有业务文件范围）：仅改backend/user-service/src/main/java/edu/hfut/campus/client/LegacyClient.java一行服务名为exception-service；保留类名/注入/方法签名、现有内部服务密钥、POST路径、credential请求、available/blocked/reason响应及原403/503业务判断。exception-service现有接口已实现相同语义，无需新控制器或跨库写入。

这不改变公开API契约，但属于已验收P2业务服务的依赖配置修改，按本轮“不得擅自扩大现有P2至P4-C业务服务修改范围”先提交。不能通过把aggregation伪注册为legacy-bridge、硬编码异常服务URL、保留未报告Node代理或跳过注册测试绕过审批。

拟实施的唯一业务服务差异（尚未应用）：

```diff
-@FeignClient(name="legacy-bridge") public interface LegacyClient  {
+@FeignClient(name="exception-service") public interface LegacyClient  {
```

验证要求：注册/管理员创建及更新访客正常、黑名单命中403、exception全部停机503且不写入用户/人员、恢复后成功、双实例Ribbon及Hystrix真实开路恢复、服务身份校验有效。旧Token/角色规则不变。

## 审批选择

建议批准A+B继续隔离实现。仅health存在用户可见契约调整；B只是一行服务发现目标变更。若只批准其中一项，其他分支继续保护，P6整体验收仍不得标为无Express依赖。C/D/E、人员删除、未知预约页面故障、HOLD及原正式库均不在本方案范围。
