# 统一启动 健康检查与关闭

在外层仓库根目录运行。适用于当前受控Windows工作区的隔离课程系统，不是生产部署或已验证的全新电脑安装器。

```powershell
python docs/p5-system.py prepare
python docs/p5-system.py start
python docs/p5-system.py health
python docs/p5-system.py status
python docs/p5-system.py stop
```

prepare是幂等本机准备：首次从已有.private阶段配置复制到被忽略的.p5-local，记录只读源码基线并准备桥接/Vite启动配置；不会复制真实数据、覆盖旧私有配置、建库、清库或执行seed。Windows仅复制受控阶段目录/配置的DACL访问规则，不复制需要额外权限的SACL，遇错停止；重复prepare已验证私有配置不变。start在已准备机器上是一条命令，启动双注册中心、双用户实例、预约、通行、双异常、隔离聚合桥及原Vite；地址http://127.0.0.1:15173，Gateway19800。每阶段有明确超时、按注册/实际请求/数据库分层检查，失败关闭本轮拥有的进程；不靠sleep认定成功。

重复start在已有自有状态时仅执行健康检查，不再创建第二套进程。端口被外部进程占用时拒绝；不会为腾端口杀死陌生进程。stop按PID和创建时间识别本轮进程并核对11端口；状态文件不存在时仍可重复stop。日志输出docs/p5-evidence/runtime-时间戳，健康/关闭报告各用新文件，不覆盖前次证据。

先决条件：已有独立Temurin11与默认JDK21并存、Maven缓存及已审核6个可执行JAR、本地MySQL8和四业务合成库、原前端node_modules、已安装Edge及私有测试依赖。当前SHA对应P4-C build-3。本轮Java未改，无需重构或重新编译；缺JAR会明确报错，不静默替换依赖。若获准重建，用docs/p2-maven.ps1和全新EvidenceDirectory执行clean verify，完成后重核版本和运行，不复用旧构建结论。

## 数据初始化边界

当前不是空库启动。P2/P3/P4/P4-C的prepare及版本SQL已经完成隔离库初始化，旧脚本有拒绝覆盖保护且分阶段依赖，不能一键重跑当作reset。p5-system.py不接收原业务库名称、不执行原npm db:init或修复脚本。新机器/新合成库完整bootstrap和导入全套演示夹具尚未交付，若要分发需单独设计四域幂等建库/最小权限账号/合成夹具/私有凭据生成和恢复校验，不能把复制本机runtime.json当作可分发安装。

合成账号格式SYN-STUDENT/TEACHER/VISITOR/ALUMNI/GUARD/ADMIN，密码及服务密钥只从受控.p5-local/runtime.json读取；不写报告、命令参数或日志。登录页演示验证码仅synthetic-demo白名单，正常短信未配置503。停机不清理合成事实/历史/HOLD，重启保持数据。

## 回归命令

普通演示启动故障注入关闭。执行已批准的故障回归时，先stop，再在当前子进程环境显式设P5_FAULT_TEST=true、start后执行python docs/p5-run-verification.py；测试会暂时停止并重启自有下游，务必最终stop。本轮不测试人工恢复HOLD，不运行人员删除、无绑定关联或任何原库脚本。start与health只在内存持有登录Token，finally退出，不记录凭证。
