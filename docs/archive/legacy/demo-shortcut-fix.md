# 隔离演示账号快捷登录修正

2026-10-21，用户单独批准将登录页五个演示按钮改为当前数据库账号，并点击直接登录。本次属于P7-A之后独立小修正，不重写P7历史验收记录，不进入P7-B。

实际显示：学生SYN-STUDENT、教职工SYN-TEACHER、校友SYN-ALUMNI、门岗SYN-GUARD、管理员SYN-ADMIN。从隔离用户库读取白名单账号当前角色/状态，缺失不展示、停用不可点击。密码不进入React源码、页面或生产dist，由现有受控本地配置在预览服务进程内读取，随后通过原Gateway→Java /api/auth/login验证，使用真实会话及数据库角色。

仅修改LoginPage.jsx、vite.config.js，新增tools/synthetic-demo-login.mjs。该Vite中间件要求既有synthetic-demo配置、显式演示开关、回环监听、隔离库名、固定白名单、同源Origin/Host和JSON POST；不是新增Java业务API，不在普通模式启用。不修改Java/Gateway/原Express或业务数据库；正常账号密码登录仍复用原api.login。

真实验证：生产构建通过；Edge逐个点击五个按钮、检查实际账号/角色首页、管理员报表权限及退出，共35项通过。额外4项验证白名单、跨主机及正常模式关闭；浏览器套件另测跨站拒绝、生产dist不含受控演示密码。首次Host边界测试使用Node fetch未实际发送自定义Host而失败，保留失败记录，改用node:http真实设置Host后通过，未为测试改变业务规则。只验证局部，不称重新完成P7全套测试。

证据：[浏览器报告](demo-shortcut-evidence/browser-report.json)、[边界报告](demo-shortcut-evidence/boundary-report.json)、[首次测试失败](demo-shortcut-evidence/boundary-first-failure.json)、[登录页截图](demo-shortcut-evidence/login-shortcuts.png)、[构建结果](demo-shortcut-evidence/build/result.json)、[源码哈希及范围](demo-shortcut-evidence/changes.json)、[原19表/DDL及备份保全](demo-shortcut-evidence/preservation.json)。原19表/备份不变，只有正常合成会话登录/退出写入。

当前前端和Java服务已重启并保持运行，地址http://127.0.0.1:15173，Express仍未运行。旧标签页刷新后使用新按钮。新电脑或非受控启动不会自动获得快捷管理员登录，不能将本机隔离入口当作生产认证方案。
