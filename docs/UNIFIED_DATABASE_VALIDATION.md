# 统一数据库验证记录

验证版本基线：ed18861 + 当前未提交的统一数据库修改。
当前数据库：campus_access_dev。18 张业务表。旧四个阶段库及完整备份保留。

## 已通过

- 项目 JDK 11 下 Maven verify：BUILD SUCCESS。现有 Maven 模块没有测试用例；此结果仅证明编译打包成功。
- 四个业务服务账号实际连接同一个数据库；均看见 18 表。
- 迁移写入计数与新库计数一致；数据转换在事务内执行。历史无效会话例外见 DATABASE.md，不声称所有旧辅助表逐行等量。
- 通行规则角色引用、设备校门引用无孤立行。
- 事务内尝试插入不存在的账号角色、规则校门，均被外键拒绝，测试事务已回滚。
- 双 Eureka 全部实例 UP（双注册中心、网关、五个业务/聚合服务）。
- 四业务服务内部 projection、Gateway /api/roles、/api/health、前端首页、前端 /api/roles 代理：全部 200。
- 临时账号通过真实 Gateway /api/auth/login 获得会话，然后验证 /api/users、/api/people、/api/faces、/api/vehicles、/api/appointments、/api/devices、/api/gates、/api/access-rules、/api/qr-codes、/api/access-records、/api/exceptions、/api/blacklist、/api/dashboard/admin、/api/reports/summary：全部 200。临时账号、会话、对应登录审计已清理。

## 迁移数据

角色 6、人员 12、账号 15、有效结构令牌 448、人脸 2、车辆 4、通知 0、审计 1593、预约 107、审批历史 250、校门 4、设备 2、拆分后规则 144、设置 1、通行凭证 132、通行/幂等事实 304、安全事件 205、黑名单 36。

源规则的笛卡尔拆分属于规范化转换，不应与源规则行数直接比较。源库测试占位数据、无效会话时间和历史辅助信息处理规则见 DATABASE.md，完整原始行可从旧库与 .private-backups 恢复。

## 文件与复验

- 建表：backend/database/unified/V001__unified_schema.sql。
- 迁移：tools/migrate-unified-local.mjs，仅新空库，禁止对已运行库重复执行。
- 结构验证：node tools/verify-unified-local.mjs。
- 登录与读取冒烟：node tools/smoke-unified-local.mjs，使用临时随机密码，结束后清理临时数据。
- 运行日志：.migration-runtime/*.log；后台 PID：.migration-runtime/pids.json。
- 本机 .env 含密码，未纳入版本控制；未新增 .gitignore 规则。

## 验证边界

未对所有角色逐页浏览，也未逐一执行预约最终审批、扫码消费、黑名单处置等全量写入闭环。接口返回 200 不代表每条业务路径已验收。短信供应商凭据未提供；历史加密恢复密钥不可恢复，使用新的本地开发恢复密钥，新旧加密状态不保证可互解。

服务边界与 API 保留；涉及原阶段库到 ed18861 的既有结构差异，部分旧历史辅助信息仅归档，不将此次合库描述为所有历史功能完全无损迁移。后续业务验收应重点覆盖签发恢复和重复请求。
