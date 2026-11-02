# F 管理员账号状态测试

2026-10-20。/account-status新增最小管理员入口，复用GET /api/users及PATCH /api/users/:id。展示账号ID、用户名、人员关联编号、角色和users.status；不把账号状态等同people.status。支持搜索及原表格分页。

启用/停用必须确认；只有后端返回对应账号及目标状态才展示确认成功，并刷新真实列表。没有挂载旧UserManagementPage，没有密码重置、默认密码或明文密码入口。自己停用和最后一名启用管理员的停用按钮保持保护，详见[边界记录](p5-account-status-boundaries.md)。后端规则未改，页面保护不是服务端全局并发保证。

[真实Edge64项报告](p5-frontend-evidence/browser-1792504296486/report.json)记录真实列表、搜索、原生确认框停用合成门岗账号、旧Token访问Java403、Express适配403、启用、重新登录成功；其他角色路由及普通角色直接PATCH拒绝。测试finally恢复合成账号状态和角色。

[停用截图](p5-frontend-evidence/browser-1792504296486/account-disabled.png)、[移动宽度截图](p5-frontend-evidence/browser-1792504296486/account-mobile.png)。[56项整体回归](p5-frontend-evidence/flow-1792504442993/report.json)包括六角色登录、资料及退出。没有实施人员删除或人员状态规则调整。

未进行管理员并发争用最后账号的后端保护测试，因为本轮未获准增加该规则；未声称页面保护解决此问题。
