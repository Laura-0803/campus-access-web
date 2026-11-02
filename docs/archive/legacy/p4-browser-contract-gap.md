# 原React核验模拟入口核查

实际`src/App.jsx:176`把`/identity-check`路由到`IdentityCheckPage`。该组件在`FeaturePages.jsx:1242`实现“异常现场处置”，操作为拒绝异常、人工核验后放行，并非扫码模拟表单。

真正调用`api.simulateScan`的`LegacyIdentityCheckPage`位于`FeaturePages.jsx:1407`，原注释明确“当前路由不再使用”，不是export组件。全仓搜索simulateScan的页面调用只找到该旧组件。不能把浏览器HTTP调用冒称原页面扫码按钮测试通过，也不能私自重接路由或新增按钮。

继续核查还发现：RulesPage虽然保留validatorForm/validateRule函数，但当前JSX没有渲染验证器表单，只渲染规则编辑及校门管理。不能将未渲染函数当作可操作UI。

建议本轮验收边界：真实Edge完成原登录、预约、两审、二维码展示、原规则编辑/校门管理、记录及异常页面；另在原页面浏览器上下文调用原`api.simulateScan`及`api.validateAccessRule`客户端，执行真实Java逻辑并确认真实记录/拒绝事件落库。明确标为“浏览器原API客户端模拟”，不标为“扫码模拟/规则验证UI按钮通过”。两个缺失UI入口列为未完成、需另批前端变更。此前建议中的“规则核验表单”推断已由此纠正。

`QRCodeMock.jsx`虽然名称带Mock，实际使用qrcode库生成可解码SVG，载荷为campus-access://qr?token=...&refresh=...，不是假二维码。测试需从真正显示的图形解码后核验，截图对二维码和输入遮罩，不能泄露完整令牌。

本问题涉及用户P4指令第九节浏览器验收与第十二节第7项“需要改变原React用户操作流程”停止条件。当前未修改原React，暂停的仅是不存在的扫码模拟UI入口验收，其他隔离开发/测试继续。
