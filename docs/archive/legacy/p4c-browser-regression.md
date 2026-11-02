# P4-C真实Edge回归

[原始报告](p4c-evidence/browser-1792499766114/report.json)。真实已安装Edge，原React页面和真实Gateway/Java/MySQL，版本与逐项结果见report，不使用Mock响应。

原访客预约→被访人审核→保卫处最终200/真实二维码→页面SVG内存解码核验→通行记录，P2六角色资料与退出、通行规则编辑、普通角色记录范围均回归。新增真实门岗/identity-check现有“拒绝”按钮调用Java动作接口，已处理状态落库；管理员原黑名单表单新增及原prompt填写移出原因完成PATCH。管理员异常态势/列表由Java实时数据提供，普通角色仍通过原dashboard按本人范围。

没有原扫码模拟按钮/规则验证器渲染，因此相关软件核验继续明确为真实Edge调用原API客户端，不伪称按钮测试。未新增按钮、HOLD页面或人员删除。报告pageerror/core console检查与截图保留；保存截图遮罩二维码和输入框，真实凭证仅内存解码。

本轮Edge在finally关闭；全站移动适配、短信送达和硬件未测试。

本轮仅隔离合成环境。原React、Express、生产数据库和历史备份不变；不进入人员删除、无绑定预约改造或后续阶段。
