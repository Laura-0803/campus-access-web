"""Document existing real closeout evidence; never fabricate a browser or build result."""
from pathlib import Path
import json,hashlib,shutil
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p2-evidence'
if (E/'closeout-summary.json').exists():raise SystemExit('Historical initial closeout document generator; preserve final reviewed documents, do not rerun')
browser=E/'browser-1792408361198/report.json';b=json.loads(browser.read_text());assert b['pass'] and len(b['results'])==77
sms=E/'batch1-1792408510168.json';s=json.loads(sms.read_text());assert s['pass'] and len(s['results'])==60
rel=lambda p:p.relative_to(D).as_posix()
# Preserve an early diagnostic screenshot privately because the unchanged login page
# shows hardcoded legacy demonstration passwords. Do not delete or publish it.
old=E/'browser-1792408246087/reset-completed.png';private=R/'.p2-local/browser-sensitive-evidence/reset-completed-initial.png'
if old.exists():
 private.parent.mkdir(exist_ok=True)
 if private.exists():raise SystemExit('Refusing to overwrite private evidence')
 digest=hashlib.sha256(old.read_bytes()).hexdigest();old.rename(private)
 (E/'browser-1792408246087/screenshot-retention.json').write_text(json.dumps({'originalName':'reset-completed.png','sha256':digest,'retainedPrivately':True,'privateRelativePath':private.relative_to(R).as_posix(),'reason':'Unchanged legacy demo buttons contain hardcoded demonstration passwords; final screenshot masks all such controls','finalPublicScreenshot':'../browser-1792408361198/reset-completed.png'},indent=2),encoding='utf-8')
browserdoc=f'''# P2真实浏览器业务回归（2026-10-19）

实际运行：Windows已安装Edge 155.0.4283.45，Playwright Core 1.64.1，无头真实Chromium内核，1440×1000。连接的浏览器工具返回apps/browsers空列表，但本机Edge可用，因此未停留在组件模拟。Playwright只安装于被忽略的`.p2-local/browser-test`，不改原package.json/lock、React、Java依赖或系统浏览器设置。

正式结果：[77项逐条报告]({rel(browser)})、[运行日志](p2-evidence/browser-run-20261019T191236/browser.log)。原React经Vite运行，真实Gateway→Java/Express→MySQL；没有用route.fulfill、Mock数据、注入假会话或直接篡改React状态。登录由页面输入合成账号完成。报告只保留HTTP路径、状态和断言，不保存请求体、密码、验证码或Token；未启用HAR/trace。截图密码/验证码表单和旧演示账号按钮均遮挡，二维码内容不截图。

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

截图：[学生首页](p2-evidence/browser-1792408361198/student-home.png)、[管理员管理结果](p2-evidence/browser-1792408361198/admin-person-managed.png)、[重置完成](p2-evidence/browser-1792408361198/reset-completed.png)、[正常模式503提示](p2-evidence/browser-1792408361198/normal-sms-unavailable.png)。六角色首页截图全部在同目录。实际抽看上述首页、管理和短信提示，样式恢复；合成role_profiles.avatar为空，侧栏头像存在破图，未修改原页面掩盖。

## 发现、失败和修正

早期记录均保留，不计为最终通过：browser-1792408028385首轮把校友access-records403误当允许；查原auth.js后按既有角色权限测试。browser-1792408096251是测试定位器未匹配必填星号；browser-1792408141787是合成管理员初始密码超过原页面32字符上限，后续测试改用24字符独立合成密码，先证实账号能够登录再停用，业务实现未改。

browser-1792408246087的71项交互断言通过，但抽查截图发现没有Tailwind样式，不能算视觉通过。隔离启动cwd原指向外层工程，使Tailwind未找到配置；只将docs/p2-runtime.py的React进程及独立正常模式Vite的cwd改为原前端目录，未改原配置/页面。最终增加6项header display:flex断言，并重跑77项。早期未遮挡旧静态演示按钮的重置截图留存在受控私有目录；公开保留screenshot-retention.json中的哈希和保留说明，最终截图已遮挡。

既有页面差异：普通角色菜单含“我的出入记录/异常记录”，而原auth.js仅guard/admin允许相关API，实际403；初轮已观察到。保留原安全权限，不以伪造200“修复”。人员页面只改变people.status，账号启停需独立users.status；原独立UserManagementPage没有App路由。原静态演示按钮账号不是新合成账号，不能直接用于隔离登录。上述问题及空头像属于尚未完成页面体验，不宣称全站浏览器通过，也未擅自更改前端。

## 重复执行

准备现有受控P2配置、合成库和已构建jar，不运行原初始化脚本。安装测试依赖命令：`npm.cmd install --prefix .p2-local/browser-test --no-audit --no-fund playwright-core@1.64.1`。原框架版本不变。

依次执行`python docs/p2-runtime.py start`、`python docs/p2-closeout-browser.py`、`python docs/p2-runtime.py stop`。15174是同一原React的独立正常模式代理，仅转发19812；15173经Gateway19800。正常模式Vite由runner在finally关闭，Edge在测试finally关闭；Java/Eureka/Gateway/过渡层由受控PID+创建时间关闭。脚本使用明确超时，失败保留report并返回非0，不能把未运行标为通过。

未运行：其他所有页面/全部业务分支、跨浏览器/移动端、真实短信送达、删除Saga。P2核心已审核不等于P2整体通过；本轮结束不进入P3。
'''
(D/'p2-browser-regression.md').write_text(browserdoc,encoding='utf-8')
accept=(D/'p2-acceptance.md').read_text(encoding='utf-8')
accept=accept.replace('人员删除暂停，真实短信通道送达未测试，浏览器视觉及全部页面交互未运行。','人员删除暂停，真实短信通道送达未测试；本轮真实浏览器77项通过，但完整页面体验仍有已记录问题。')
accept=accept.replace('浏览器资料页未验收','六角色浏览器资料保存/回读通过；非全字段')
accept=accept.replace('浏览器对应页面未验收','人员/关联账号增改页面通过；账号停用为浏览器HTTP验证，其他页面未全覆盖')
accept+='''
## P2收尾补充（2026-10-19，等待审核）

新增真实Edge浏览器77项通过，短信/身份HTTP安全60项重跑通过；这两次独立运行不改写此前330项基线，也不把重复断言累计成唯一测试数量。浏览器细节、失败历史、页面限制及截图见[p2-browser-regression.md](p2-browser-regression.md)。Maven本轮未重新构建：Java及已通过backend源码/配置哈希与前次交付清单一致，继续使用前次clean verify构建产物；这不是新构建通过的声明。

|收尾项|代码实现|编译|真实运行|结果/尚未完成|
|---|---|---|---|---|
|Playwright回归|测试脚本已实现|Node脚本，非Maven|是，真实Edge|77项断言通过；原菜单与记录权限不一致、未路由账号状态页、合成空头像及全站覆盖仍未完成|
|短信边界|沿用已审Java实现|沿用已通过产物|浏览器及HTTP|503/无泄码、白名单、限流、过期、次数、一次性、重置撤销全部会话通过；不要求本轮接入供应商，真实送达仍未测试|
|33条接口逐项核对|32实现、1未实现|32已编译|32已有真实证据|新增Controller/Mapper/请求响应/权限/证据最终表；4聚合保留Express|
|人员删除详细设计|仅文档|无实现/无编译|未运行|操作状态/幂等撤销/恢复/表结构/测试计划待单独审批；无Java DELETE，无202或删除中字段|
|保全与隔离|只读脚本|不适用|是|本轮最终结果见补充测试证据；原68文件/19表/备份保全，两个账号域隔离|

P2整体验收仍未通过。不得把浏览器关键流程通过写成全部页面/正式短信/人员删除通过；没有切换原业务库、替换Express生产后端或进入P3。
'''
(D/'p2-acceptance.md').write_text(accept,encoding='utf-8')
security=(D/'p2-security-test.md').read_text(encoding='utf-8').replace('没有浏览器/全量畸形及超限请求/压力测试','未完成全站浏览器/全量畸形及超限请求/压力测试')
security+='''
## 收尾重跑

真实浏览器77项中五普通角色管理页重定向且users403，六角色退出后Java/Express401，管理员停用账号后旧Token立即被拒绝；无未处理pageerror。正常模式原找回密码页实际显示503信息。详见[浏览器回归](p2-browser-regression.md)。

60项认证/短信安全原套件重新实际执行，见[batch1-1792408510168.json](p2-evidence/batch1-1792408510168.json)：非白名单403、正常send-code503无code、reset-code浏览器503无code、60秒限流429、连续错误5次后429、过期400、重用400；重置后两个既有会话Java均401，Express旧会话401。演示码仅内存变量，无日志/报告明文。真实短信送达未测试，不标记全功能通过。

原普通角色records/exceptions菜单与后端权限不一致，保持原auth.js的guard/admin权限；没有为浏览器用例关闭鉴权。Java人员删除仍未实现，单纯人员停用不等于跨域QR全部撤销；[删除设计](p2-delete-detailed-design.md)仅待审批。
'''
(D/'p2-security-test.md').write_text(security,encoding='utf-8')
evidence=(D/'p2-test-evidence.md').read_text(encoding='utf-8')
evidence=evidence.replace('未运行：真实短信送达、浏览器视觉/全页面交互、人员跨域删除与失败恢复、生产切换、多机HA及全面压力测试。浏览器工具实际返回apps/browsers空列表，见[browser-availability.json](p2-evidence/browser-availability.json)。组件测试虽执行原LoginPage.jsx和真实后端，不能替代这些未完成项。','前次交付未运行浏览器，工具空列表证据仍保留。现已找到本机Edge并完成本轮关键页面回归，见下方补充；全页面交互、真实短信送达、人员跨域删除与失败恢复、生产切换、多机HA及全面压力测试仍未完成。')
evidence+=f'''
## P2收尾真实证据（不覆盖前次基线）

|项目|本轮实际执行|证据|
|---|---|---|
|真实Edge浏览器|77项断言通过、0未处理pageerror、截图复核样式|[报告]({rel(browser)})、[解释/截图](p2-browser-regression.md)|
|认证/短信边界|原套件60项重跑通过|[原始断言]({rel(sms)})|
|33条最终核对|32 Controller方法及Mapper语句ID静态核验；DELETE无实现|[静态审计](p2-evidence/closeout-api-audit.json)、[逐项表](p2-api-migration.md)|
|两个账号权限|各自仅所属schema DML，无DDL，原库/另一域SELECT被拒绝|[权限复核](p2-evidence/closeout-isolation.json)|
|原19表及备份|只读一致性事务核对数据/DDL及原备份、长期副本|[本轮保全](p2-evidence/closeout-preservation.json)|
|源文件/Git/进程|68文件相同、无敏感跟踪、全部自有监听关闭|[最终状态](p2-evidence/closeout-summary.json)|

Maven未重跑，业务Java及backend文件与前次清单散列相同；前次clean verify和330项真实证据继续保留，不伪造新编译记录。新增77和重跑60分开计数。新增脚本、报告和文档见更新后的[p2-implementation-files.csv](p2-implementation-files.csv)。收尾前文档及旧文件清单已归档p2-evidence/closeout-input，不改写P1/P2历史证据。

人员删除设计只文档，未执行SQL/HTTP，详见[p2-delete-detailed-design.md](p2-delete-detailed-design.md)。正常模式503符合本轮验收边界，真实短信送达仍未测试；原页面体验和全覆盖风险不隐藏。
'''
(D/'p2-test-evidence.md').write_text(evidence,encoding='utf-8')
progress=(D/'migration-progress.md').read_text(encoding='utf-8')
heading='## P2收尾（当前状态）\n\n核心32条保持原已审核实现及框架版本，真实Edge关键流程77项通过，短信/认证安全60项重跑通过；此前330项证据保留。33条Controller/Mapper/权限/契约逐项复核已补齐；人员删除仅详细设计待单独审批。真实短信送达未测试（本轮不要求接供应商），原菜单权限、账号管理入口等页面体验问题未改前端。P2整体仍未验收，不进入P3、不切换原库、不替换Express生产后端。见[p2-acceptance.md](p2-acceptance.md)。\n\n'
progress=progress.replace('# 迁移进度\n\n','# 迁移进度\n\n'+heading,1)
progress=progress.replace('## 本轮P2实施交付','## 前次P2实施交付（收尾前历史）',1)
(D/'migration-progress.md').write_text(progress,encoding='utf-8')
print('Closeout documents generated from actual 77 browser / 60 SMS assertions; no acceptance fabricated')
