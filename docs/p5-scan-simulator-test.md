# A 扫码模拟测试

2026-10-20，页面已实现、API已接通、Edge真实点击及业务验证通过。入口/scan-simulator仅门岗安保和保卫处管理员。原/identity-check保持现场异常工作台。

凭证类型/值、校门、方式及可选设备沿用现有字段；凭证值为密码输入。每次独立操作由crypto.randomUUID产生操作ID，通过Idempotency-Key发送。同一操作的重试复用原条件与ID；sessionStorage仅保存非敏感条件、摘要及操作ID。未知时禁止开始新操作，刷新后必须输入同一凭证才能重试。没有前端生成记录或异常事件。

首次明确4xx显示请求失败；超时、断链、5xx或不能确认响应显示结果未知；200必须校验allowed与真实record.id。allowed=false显示拒绝通行。已确认结果可显式开始新操作。

[64项报告](p5-frontend-evidence/browser-1792504296486/report.json)包含：两类允许角色、其他四角色拒绝、有效校园卡、无效/过期/撤销二维码、停用人员、停用设备、真实拒绝异常入库、相同ID重放不新增记录、丢回执后刷新重试仅一条记录、停用账号403明确失败、真实服务停机未知及恢复重试。SQL检查为真实隔离数据库查询。

[完整闭环56项报告](p5-frontend-evidence/flow-1792504442993/report.json)使用真实签发二维码，通过新页面提交核验，再核对记录、异常及处置。该流程不是直接API冒充点击。

截图：[允许](p5-frontend-evidence/browser-1792504296486/scan-allowed.png)、[拒绝](p5-frontend-evidence/browser-1792504296486/scan-denied.png)、[未知](p5-frontend-evidence/browser-1792504296486/scan-unknown.png)。敏感输入已遮罩。真实门禁硬件未测试，跨浏览器/设备的未知操作恢复未实现。
