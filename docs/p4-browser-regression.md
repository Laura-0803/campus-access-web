# P4真实Edge回归

[report.json](p4-evidence/browser-1792422091501/report.json)：52项通过。Edge 155.0.4283.45，Playwright 1.64.1，二维码jsQR解码器1.4.0。使用原React页面，未改业务页面。

实际UI覆盖六角色登录、访客创建预约、被访人审核、保卫处最终审核、访客二维码展示、出入记录、规则编辑、异常页及P2资料/退出回归。页面生成的真实QR截图仅在内存解码，与已签发凭证一致后只存摘要；保存截图全部遮罩二维码和输入框。

扫码模拟及规则验证在当前React路由中没有可用按钮/挂载页面。测试从真实Edge调用原API客户端api.simulateScan和api.validateAccessRule，走Gateway/Java/SQL，并验证拒绝及真实落库，**不是模拟按钮点击通过**。该UI覆盖缺口和验收方式仍待用户确认，见[p4-browser-contract-gap.md](p4-browser-contract-gap.md)。不擅自新增UI。

无影响核心业务的未处理页面异常；预期401/403等资源警告单独记录，未伪装控制台绝无消息。截图已人工查看遮罩访客二维码图；真实校门硬件、移动全站、短信送达未测试。

截图：[访客真实二维码遮罩](p4-evidence/browser-1792422091501/visitor-qr-masked.png)、[审批](p4-evidence/browser-1792422091501/security-approved.png)、[通行记录](p4-evidence/browser-1792422091501/guard-records.png)。测试finally关闭其Edge，九个隔离服务端口最终关闭。

本轮仅隔离环境。原生产流量与数据库未切换，原React和Express源码未修改；P2人员删除未开放，P4-C没有正式实现。全部通过数表示本轮实际断言数，不表示全部需求已验收。
