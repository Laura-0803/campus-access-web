# B 通行规则验证测试

2026-10-20。保留原/rules编辑器，只在原页面增加管理员验证面板，复用既有状态及validate函数，不新增接口。明确提示“规则验证不会登记真实通行记录”。

凭证类型和值、校门和方式提交既有POST /api/access-rules/validate。只显示后端实际判断及必要信息；请求异常、非布尔判断不能显示允许。敏感值不回显。

[真实Edge64项报告](p5-frontend-evidence/browser-1792504296486/report.json)：普通角色页面及直接API被拒绝，合法校园卡允许，非法限制时间25:99拒绝，23:00-01:00跨午夜规则按当前上海时间核对，未知人员拒绝。临时规则数据仅在隔离库修改并finally恢复。验证前后真实access_records计数一致。实际停止access-service后页面安全失败，恢复后正常。

[完整业务回归](p5-frontend-evidence/flow-1792504442993/report.json)通过新验证面板提交真实预约二维码；原规则编辑与二维码闭环继续可用。[拒绝截图](p5-frontend-evidence/browser-1792504296486/rule-denied.png)。

本轮未单独在页面注入未知预约、时区切换和所有缺失规则组合；不将P4-C既有后端证据冒充本轮页面实测。未修改AccessPolicy或已批准的安全拒绝策略。
