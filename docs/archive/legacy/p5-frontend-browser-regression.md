# P5第二批真实浏览器回归

2026-10-20，实际安装Edge 155.0.4283.45，以Playwright驱动真实浏览器，无Mock业务响应。仅“丢回执”用浏览器代理先转发真实请求、待真实写库后中断回执，不伪造后端成功。

|运行|结果|证据|
|---|---|---|
|最终A/B/F专项|64/64通过|[report.json](p5-frontend-evidence/browser-1792504296486/report.json)|
|核心业务整体回归|56/56通过|[report.json](p5-frontend-evidence/flow-1792504442993/report.json)|
|生产构建及语法|通过|[构建](p5-frontend-evidence/build-20261020T215124852721/result.json)、[静态](p5-frontend-evidence/static-1792504295629.json)|

整体回归实际操作原访客预约表单、被访人审核、管理员最终审批、原二维码展示，新扫码/验证表单、通行记录、异常与门岗处置、黑名单、统计报表及六角色登录退出。二维码从真实SVG在内存解码，核验与数据库记录相符。报告区分页面点击与辅助API/SQL数据准备。统计报表仍由Express过渡聚合，不宣称全Java迁移。

最终专项无未处理pageerror。预期403、拒绝、故障测试的网络错误不等同未处理JavaScript异常。1440宽及390宽账号页面截图完成；不宣称全站移动端验收。

复现：依照[p5-startup-and-shutdown.md](p5-startup-and-shutdown.md)启动隔离系统，运行`python docs/p5-frontend-build.py`、`node docs/p5-frontend-static.mjs`、`node docs/p5-frontend-browser-test.mjs`、`node docs/p5-frontend-regression-browser.mjs`，最后`python docs/p5-system.py stop`。需要既有私密隔离配置与合成账号，不能接生产库。

早期browser目录保留了失败报告：路由等待、会话持久化等待、标签定位以及测试脚本中文传输损坏。修复的是测试等待/定位；这些失败运行不标通过。最终报告指向上述两个成功目录。首次关闭检查存在端口退出延迟，原失败记录保留；再次确认11端口均关闭，见[最终关闭证据](p5-frontend-evidence/closure-final.json)。

当前限制：B未知预约页面故障未单独复测；真实硬件、全站移动端、短信送达均未测。C/D/E和最后管理员自停用语义不在本次通过范围。
