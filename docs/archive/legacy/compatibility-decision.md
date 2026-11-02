<!-- P4C-CURRENT-BEGIN -->
## 当前P4-C状态（2026-10-20，等待验收）

用户已批准P4-A/B此前范围及P4-C实施、A+B安全差异。独立exception-service和10条原API已实现、编译、注册、Gateway及真实SQL/HTTP/Edge验证，共496项断言。异常/黑名单归独立库；预约/通行按Eureka+Feign/Ribbon查询正式异常服务；事件幂等inbox及原access_outbox续投，审计独立outbox。旧桥接仅聚合与P2注册黑名单代理，无名单缓存或异常写入。非法时间拒绝，处置单向且成功同键重放200。原68文件、19表及备份不变，测试进程已关闭，未进入后续阶段。见[p4c-acceptance.md](p4c-acceptance.md)。以下历史阶段状态不代表当前授权。

<!-- P4C-CURRENT-END -->

<!-- P4-CURRENT-BEGIN -->
## 当前P4状态（2026-10-19，等待审核）

P4-A独立access-service及15条原API已实现、编译、启动并真实验证。P4-B已绑定人员真实签发闭环已完成隔离复验；未知503与确认后重放200按已批准契约执行。最终构建build-9，399项真实断言通过。未绑定人员最终审批仍503保护，原页面缺失扫码/规则验证入口未补写，详见[p4-acceptance.md](p4-acceptance.md)。P4-C仅分析，人员删除未实施。原系统及备份校验一致，本轮进程已关闭；没有正式切流或进入后续阶段。以下较早阶段内容保留作历史记录，以本段及各阶段真实证据判定当前状态。

<!-- P4-CURRENT-END -->

# P1版本兼容性决策：本机实验通过

用户要求的LEGACY_STRICT已完成真实Maven解析、编译、JUnit、六JVM启动和完整故障实验；未替换Ribbon/Hystrix。具体版本见p1-acceptance.md。此结论只覆盖本机隔离课程原型，不表示旧版本仍受官方维护或已经具备生产安全性。

Boot2.3.12.RELEASE + CloudHoxton.SR12的BOM及所有原定版本保持不变。本轮新依赖树与旧依赖树坐标集合完全一致，四个可执行JAR中的运行库文件名集合也相同；证据为p1-evidence/resume-summary.json和resume-dependencies/dependency-tree.txt。不能仅凭编译判兼容，本轮还实际通过双向Eureka、Ribbon双实例、Feign/Gateway、Hystrix开路/短路/探测/恢复以及MyBatis真实MySQL CRUD。

上轮Ribbon失败根因是Eureka peer身份配置，不是版本组合：prefer-ip-address=true使节点127.0.0.1误匹配对端；Eureka1.10.14按主机名排除自身，不看端口。修复只涉及实验注册中心prefer-ip-address=false；没有添加固定提供者列表。原9秒租约修复对照也通过。

本机JAR反汇编同时确认Hystrix1.5.18无独立HALF_OPEN枚举，采用真实单探测门控验证，见p1-hystrix-test.md。现代替代路线没有启用。旧研究/首次失败的完整文件保存在p1-evidence/resume-input；原始失败JSON与日志仍保留。

最终是否批准用于正式课程业务迁移，仍由用户审核P1后决定；当前不开始P2、不部署外网、不改原业务系统。


## P3 (2026-10-19)

P3: Java 11 / Boot 2.3.12.RELEASE / Cloud Hoxton.SR12; same Ribbon 2.3.0, Hystrix 1.5.18, OpenFeign/Gateway 2.2.9.RELEASE, MyBatis starter 2.1.4. Actual clean verify: p3-evidence/build-6/maven.log; actual dependency resolution: p3-evidence/dependencies/maven.log. No replacement components. See p3-test-evidence.md.
