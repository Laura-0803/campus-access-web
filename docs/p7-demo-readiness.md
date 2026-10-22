# 演示就绪与复现说明

2026-10-21；这是已准备的本机隔离环境清单，不是新电脑自动安装保证。本轮真实启动/回归/关闭状态以[p7-test-evidence.md](p7-test-evidence.md)为准。完成审计后所有实验服务关闭，现场需重新start。

## 计时前

1. 确认MySQL8运行，4个原有合成Schema/账号仍存在且互相不可读；不使用原业务库账号开发，不运行初始化/seed/修复脚本。
2. 独立JDK11、Maven缓存、Node依赖、7个JAR、dist及受控私密配置存在。本机缺失任一项应停止并报告，不复制真实数据弥补。
3. 执行`python docs/p7-system.py status`；如果本轮拥有进程仍在，先stop。遇陌生端口占用，不杀未知进程。
4. `python docs/p7-system.py start`，再`health`。就绪需五组件健康、两个注册中心见UP、实际Ribbon下游列表齐备、Express19830关闭。不能只看页面打开或端口监听。
5. 访问http://127.0.0.1:15173；注册中心http://127.0.0.1:19761和19762；Gateway19800。健康含实际SQL读取，超时应503，不以部分可用标整体健康。
6. 检查六合成账号可登录，预热目标页面；学生SYN-P-student、访客SYN-P-visitor用于已绑定闭环。只私下取密码，不在投影显示配置或Network的敏感响应。
7. 预约时段、东门规则/设备和黑名单正确；不改生产表。预备无效合成凭证用于拒绝事件。关闭无关浏览器扩展；图表等原动画结束后再截图。

## 重建（必要时，先停服务）

```powershell
python docs/p7-system.py stop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File docs/p2-maven.ps1 -EvidenceDirectory docs/p7-evidence/your-new-build-name
cd campus-access-web
npm.cmd run build
cd ..
python docs/p7-system.py start
python docs/p7-system.py health
```

EvidenceDirectory必须是从未存在的新目录，不能覆盖本轮日志。ExecutionPolicy仅对子进程生效，未修改机器/用户策略。Maven脚本使用已验证独立JDK11，默认全局JDK21不动。clean verify无单元测试时如实记录；业务运行验收另行执行。

## 回归与结束

`python docs/p7-run-regression.py`依次运行真实HTTP/SQL、六角色、状态机、事务、Edge主流程/A-B-F、Ribbon/Hystrix故障、重启及报表截图。它会产生合成业务历史、短时停止自有服务，并非只读health；不要在正常讲解时并行运行。首次实际运行结果保留在p7-evidence。

结束执行`python docs/p7-system.py stop`、再`status`，要求11服务端口及旧Express端口共12项关闭、拥有状态移除。MySQL是既有基础服务，不由实验stop关闭；所有Edge测试上下文由脚本finally关闭。脚本中“P4进程”旧输出标签不是启动旧Express，判断以PID/端口和实际路由为准。

## 交付尚未涵盖

本人5分钟现场讲解计时彩排、正式Word/PDF报告排版与提交、全新电脑安装、真实短信/门禁/手机端全覆盖、多主机故障均未自动列为通过。HOLD、无绑定、删除、最后管理员保护只提供风险与替代路径，不在P7-A实现。
