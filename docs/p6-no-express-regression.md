# P6 无Express运行实际验收

2026-10-20。五条公开接口已转Java，user-service黑名单Feign按批准直连exception-service。Gateway P6模式没有Express兜底；隔离后端19830未监听，11个自有运行组件中没有adapter。保留原Express源码与旧模式，未正式切换。

## 实际结果

使用既有React生产dist，Vite preview仅提供静态页面和Gateway代理，不是Express业务服务。Edge 155.0.4283.45通过真实表单点击完成访客注册及登录、管理员启停、六角色资料及退出、预约创建/被访人审核/保卫处最终200、SVG真实二维码解码校验、新扫码、通行SQL记录、异常自动生成及门岗处置、黑名单管理、首页与统计报表。辅助API/SQL只用于夹具或验证，不冒充页面点击。

- [最终build-4整体56项页面回归及截图](p6-evidence/browser-flow-1792508764780/report.json)
- [注册及管理员11项](p6-evidence/browser-registration-1792507330925/report.json)，含Express端口关闭检查
- [A/B/F 64项](p6-evidence/browser-abf-1792508001105/report.json)，包含真实服务停机后页面失败及恢复
- [Eureka/Gateway/纯Java就绪检查](p6-evidence/ready-1792508254167.json)，含双注册中心聚合服务UP、五API可达和双方Ribbon列表
- [完整测试清单](p6-test-evidence.md)
- [最终完整冷启动就绪](p6-evidence/ready-1792509199283.json)、[最终全部端口关闭](p6-evidence/closure-20261020T231352961147.json)、[动画完成后的真实统计图](p6-evidence/reports-rendered.png)

HTTP报告记录处理服务X-P6-Service，五API不再落回Express。普通角色首页仍由Java按原归属收窄，管理员报表SQL计数核对；无效Token、伪造身份头及越权被拒绝。最终截图敏感输入/二维码已遮罩，未记录验证码、密码或完整Token。

## 复现及关闭

前提为原受控Windows环境、独立JDK11、本机MySQL四个已建合成库、P5私密配置、已验证JAR与原生产dist、Edge。`python docs/p6-system.py start`启动并做分层有界就绪检查；`health`/`status`查看；`stop`按PID及创建时间关闭，核对12个相关端口（含已停Express）。不运行原库初始化、修复、seed或数据复制。首次构建用独立EvidenceDirectory执行p2-maven.ps1；须先停JAR进程再clean，避免Windows文件锁。新机bootstrap不在范围。

两次首次冷调用503为已批准P4未知签发语义，原样保留，自动恢复及同操作重放200已验证。不能把“最终后来通过”覆盖首次失败，报告明确保留限制。人员删除404、无绑定最终503、HOLD人工恢复禁用；未知预约验证页面故障、真实短信/硬件/全站移动端仍未测试。

## 原实施前计划（历史，步骤均有对应实际证据）

1. 构建独立aggregation-service，真实Eureka双节点发现四域，带受保护内部身份经Feign获取投影；聚合不配置数据源。
2. 保留隔离旧桥用于对照，冻结测试写入窗口；六角色首页、管理员代查/跨角色拒绝、报表分组/筛选/顺序/空值全部逐字段比较，并核对域内SQL。原单体与当前桥的差异分别记录。
3. 验证异常服务作为用户黑名单直接提供者，正常/命中/故障及恢复；不跳过访客注册等隐含依赖。
4. 对照通过再切隔离Gateway精确五路由；健康响应必须按获批契约。未命中返回404，不能继续通配回落到Express。记录Gateway处理服务与注册实例。
5. 按PID及创建时间停止本轮自有Express进程，核对19830未监听；不能杀未知进程。使用已有React生产构建dist，静态Web服务器不是Express业务后端。
6. 真实Edge六角色首页、资料/退出、访客预约、被访人审核、管理员最终200及真实二维码、新扫码/验证入口、记录、异常生成/处置、黑名单及统计报表。普通角色和无效Token真实拒绝；正常无绑定最终审批仍503，删除仍禁用。
7. 聚合Feign连续至少20请求证明双user/exception实例实际响应；停掉对应全部提供者，记录503、Hystrix真实open与短路计数，恢复后半开成功与业务数据恢复。不能空统计降级。
8. 关键事务、持久化重启及P2–P5回归，原19表/全部原Express/获批前端基线/备份/HOLD保全，最后所有本轮进程关闭。

以上计划沿革保留。未通过隐藏页面或删除权限断言移除依赖；没有实施C/D/E或生产切换。关闭与保全最终状态见p6-test-evidence收尾段。
