# P3真实浏览器回归

使用本机安装的真实Microsoft Edge155.0.4283.45，Playwright-core1.64.1控制，无Mock API、无原React页面修改。报告与截图索引由p3-test-evidence.md列出；本轮成功报告70项，原始失败报告保留。

最终报告：[browser-1792413807027/report.json](p3-evidence/browser-1792413807027/report.json)；[访客提交截图](p3-evidence/browser-1792413807027/visitor-create-success.png)、[学生审批截图](p3-evidence/browser-1792413807027/student-appointments.png)、[管理员驳回截图](p3-evidence/browser-1792413807027/admin-appointments.png)。

验证六角色登录并进入各自页面、原样式生效、P2个人资料保存、预约访问权限。student/teacher/visitor/admin列表与未通过筛选可用，guard/alumni被拒；详情通过真实浏览器HTTP验证（原页面没有详情弹窗，不宣称存在）。

访客原表单真实POST201并查询新预约；学生原审核按钮200进入待保卫处审核，qrCode:null；管理员最终通过按钮明确503错误提示，随后驳回200。未使用假二维码、未显示最终批准成功。六角色原出入记录页面、允许的异常页面继续通过隔离Express访问。退出后Java预约及Express请求均401，无未处理pageerror。

截图在各browser-*目录：角色预约列表、visitor-create-success.png。输入已遮罩，不保存登录密码、完整Token或验证码。正常控制台图片资源历史问题不等同于业务异常；报告关注pageerror及API业务结果，未声称穷尽全部控制台warning。

初次批准后浏览器报告在admin提示定位时因同文本多处出现失败；修改测试定位为first及原按钮“驳回”，没有修改React或业务响应。之后真实完整回归通过。正式QR流程等待P4；全站移动端不在本轮验收。
