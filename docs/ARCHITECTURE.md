# 微服务架构与调用链

正式演示链路为 React → Spring Cloud Gateway → Java 业务服务 → MySQL。两个 Eureka 节点互为 peer；Gateway 使用 `lb://` 路由，服务间使用 OpenFeign，Ribbon 负责客户端负载均衡，Hystrix 提供超时、熔断与降级。

```text
React :15173 → Gateway :19800
  ├─ user-service :19811 ─────── user DB
  ├─ appointment-service :19821 ─ appointment DB
  ├─ access-service :19841 ───── access DB
  ├─ exception-service :19851 ── exception DB
  └─ aggregation-service :19861 → Feign/Ribbon 调用四业务服务

Eureka peer A :19761 ⇄ Eureka peer B :19762
```

核心闭环：用户/人员由 user-service 管理；访客预约进入 appointment-service；最终审批通过后经 Feign 调用 access-service 签发二维码；扫码生成通行记录；拒绝或高风险事件进入 exception-service，门岗完成处置；aggregation-service 汇总首页与报表。

服务边界采用独立数据库。跨服务 ID 是逻辑引用，禁止增加跨库外键；域内 `users/people/sessions/faces/vehicles` 已使用外键。Gateway 的阶段开关保持原样，以免改变正式 API 行为。

旧 Express 位于 `campus-access-web/server/`，只保留为历史兼容与回归参考，P7 Java 演示不启动。`experiments/p1-legacy-lab/` 是 Eureka/Ribbon/Hystrix 兼容性实验，不属于正式 Maven reactor。
