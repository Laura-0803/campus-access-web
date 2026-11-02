# P2真实浏览器业务回归（2026-10-19）

实际运行：Windows已安装Edge 155.0.4283.45，Playwright Core 1.64.1，无头真实Chromium内核，1440×1000。连接的浏览器工具返回apps/browsers空列表，但本机Edge可用，因此未停留在组件模拟。Playwright只安装于被忽略的`.p2-local/browser-test`，不改原package.json/lock、React、Java依赖或系统浏览器设置。

正式结果：[91项逐条报告](p2-evidence/browser-1792408928412/report.json)、[运行日志](p2-evidence/browser-run-20261019T192204/browser.log)。原React经Vite运行，真实Gateway→Java/Express→MySQL；没有用route.fulfill、Mock数据、注入假会话或直接篡改React状态。登录由页面输入合成账号完成。报告只保留HTTP路径、状态和断言，不保存请求体、密码、验证码或Token；未启用HAR/trace。截图密码/验证码表单和旧演示账号按钮均遮挡，二维码内容不截图。

|场景|实际执行/结果|边界|
|---|---|---|
|六角色登录/首页|六次原登录表单、角色URL和Session角色及dashboard成功断言通过|合成账号手输，不点击原固定演示账号|
|个人资料|六角色页面保存电话，HTTP回读数据库值通过|未覆盖每种资料字段/移动布局|
|管理员创建/修改|原people页面新增人员及关联账号、编辑保存，查询users验证通过|原页面分两次HTTP写入；不是跨HTTP事务|
|管理员停用|原people页面停用人员通过；浏览器fetch PATCH users停用账号通过，登录403、旧Token访问Express403|原App没有路由到UserManagementPage，不能把账号停用HTTP称为完整点击UI通过；人员状态不等同账号状态|
|普通角色禁止管理|五角色打开people重定向自己首页，浏览器请求users403|同时验证页面门禁与后端鉴权|
|未迁移业务|学生/教师review、访客appointment-status、校友alumni-qr、门岗records、管理员appointments页面及相应原API200|按角色既有权限；不放宽记录/异常接口权限|
|退出失效|六角色点击退出后，持有旧Token的Java和Express请求均401|Token仅内存中使用|
|验证码演示|原找回密码表单获取演示码、提交重置、回到登录提示通过|仅synthetic-demo；本轮浏览器未重跑访客注册，原组件及HTTP注册证据仍保留|
|正常短信不可用|15174同一原React页面→19812正常模式，reset-code503且显示短信通道未配置，无code|真实请求转发，无假响应；真实短信送达未测试|
|控制台|未处理pageerror为0；布局样式6项检查通过|不是“控制台零消息”；有原React Router未来版本提示及负向测试预期401/403/503资源错误|

截图：[学生首页](p2-evidence/browser-1792408928412/student-home.png)、[管理员管理结果](p2-evidence/browser-1792408928412/admin-person-managed.png)、[重置完成](p2-evidence/browser-1792408928412/reset-completed.png)、[正常模式503提示](p2-evidence/browser-1792408928412/normal-sms-unavailable.png)。六角色首页截图全部在同目录。实际抽看上述首页、管理和短信提示，样式恢复；合成role_profiles.avatar为空，侧栏头像存在破图，未修改原页面掩盖。

## 发现、失败和修正

早期记录均保留，不计为最终通过：browser-1792408028385首轮把校友access-records403误当允许；查原auth.js后按既有角色权限测试。browser-1792408096251是测试定位器未匹配必填星号；browser-1792408141787是合成管理员初始密码超过原页面32字符上限，后续测试改用24字符独立合成密码，先证实账号能够登录再停用，业务实现未改。

browser-1792408246087的71项交互断言通过，但抽查截图发现没有Tailwind样式，不能算视觉通过。隔离启动cwd原指向外层工程，使Tailwind未找到配置；只将docs/p2-runtime.py的React进程及独立正常模式Vite的cwd改为原前端目录，未改原配置/页面。最终增加6项header display:flex断言，并重跑91项。早期未遮挡旧静态演示按钮的重置截图留存在受控私有目录；公开保留screenshot-retention.json中的哈希和保留说明，最终截图已遮挡。

更正早期判断：普通角色直接请求全量access-records/exceptions得到403是正确权限行为，不能推断页面失败。MonitorPage和ExceptionCenterPage对普通角色实际调用roleDashboard，读取本人records/exceptions。最终已补学生、教师、访客、校友这两个页面的8项真实导航、标题及本人数据响应断言通过；没有修改原页面或鉴权。

仍有页面边界：人员页面只改变people.status，账号启停需独立users.status；原独立UserManagementPage没有App路由。原静态演示按钮账号不是新合成账号，不能直接用于隔离登录。账号停用的完整点击入口、合成空头像及全站覆盖未完成，不宣称全站浏览器通过。

最终加强验证：资料电话先改成不同合成值，HTTP回读后再通过页面恢复白名单原号码，新增6项恢复断言；未迁移页面等待本次导航的新响应，校友二维码页按实际源码等待dashboard/alumni，而不是假定页面请求qr-codes。browser-1792408749351记录启动发现缓存尚未就绪时login503；runner已增加Gateway、双Eureka、实际Ribbon列表的120秒分层门槛。browser-1792408795911是测试误等校友qr-codes超时；browser-1792408866957是读取导航期间已被React卸载的响应体失败，改为等待实际页面响应/标题，再从当前页面真实请求核对本人数据。均保留失败记录，未更改Java/Express业务。最终91项通过。

## 重复执行

准备现有受控P2配置、合成库和已构建jar，不运行原初始化脚本。安装测试依赖命令：`npm.cmd install --prefix .p2-local/browser-test --no-audit --no-fund playwright-core@1.64.1`。原框架版本不变。

依次执行`python docs/p2-runtime.py start`、`python docs/p2-closeout-browser.py`、`python docs/p2-runtime.py stop`。15174是同一原React的独立正常模式代理，仅转发19812；15173经Gateway19800。正常模式Vite由runner在finally关闭，Edge在测试finally关闭；Java/Eureka/Gateway/过渡层由受控PID+创建时间关闭。脚本使用明确超时，失败保留report并返回非0，不能把未运行标为通过。

未运行：其他所有页面/全部业务分支、跨浏览器/移动端、真实短信送达、删除Saga。P2核心已审核不等于P2整体通过；本轮结束不进入P3。
