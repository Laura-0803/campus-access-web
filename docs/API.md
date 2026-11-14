# API 与权限边界

## 1. 通用约定

- 浏览器统一通过 Gateway 的 `/api` 前缀访问业务接口。
- 使用 Bearer Token；后端兼容 `x-campus-token`。
- 成功响应保持现有 envelope，通常为 `{success:true,data,...}`。
- 失败响应为 `{success:false,error:{message,details}}`，`details` 可能省略。
- 列表接口通常直接返回数组，前端负责分页；不得擅自改成统一 Page 对象。
- 前端字段继续使用 `camelCase`，数据库使用 `snake_case`，由 Mapper/Service 负责转换。
- 非登录请求遇到 401 时，前端清除 `campus_session`、`campus_token`、`campus_user` 并触发 `campus:auth-expired`。
- `/internal/**` 仅用于服务间调用，必须提供内部密钥，不是公开 API。

## 2. 业务路由

| 领域 | 核心路径 | 服务 |
|---|---|---|
| 认证与账号 | `/api/auth/**`、`/api/users/**` | `user-service` |
| 人员与角色 | `/api/people/**`、`/api/roles/**`、`/api/profiles/**` | `user-service` |
| 人脸、车辆、通知 | `/api/faces/**`、`/api/vehicles/**`、`/api/messages/**` | `user-service` |
| 预约审批 | `/api/appointments/**` | `appointment-service` |
| 凭证与通行 | `/api/qr-codes/**`、`/api/access-records/**` | `access-service` |
| 设备与规则 | `/api/devices/**`、`/api/gates/**`、`/api/access-rules/**` | `access-service` |
| 安全事件 | `/api/exceptions/**`、`/api/blacklist/**` | `exception-service` |
| 首页与报表 | `/api/dashboard/**`、`/api/reports/**` | `aggregation-service` |
| 健康检查 | `/api/health` | `aggregation-service` |

## 3. 六类角色权限

| 能力 | 学生 | 教职工 | 访客 | 校友 | 门岗 | 管理员 |
|---|---|---|---|---|---|---|
| 登录、退出、修改本人密码 | 本人 | 本人 | 本人 | 本人 | 本人 | 本人 |
| 查看或修改本人资料 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 用户、人员、角色管理 | — | — | — | — | — | ✓ |
| 创建预约 | — | — | 本人 | — | — | 可代录 |
| 被访人审批 | 相关预约 | 相关预约 | — | — | — | — |
| 保卫处最终审批 | — | — | — | — | — | ✓ |
| 查看或核验通行凭证 | — | — | 本人 | 本人 | 全部 | 全部 |
| 扫码通行和通行记录 | — | — | — | — | ✓ | ✓ |
| 设备读取 | — | — | — | — | ✓ | ✓ |
| 设备、校门和规则维护 | — | — | — | — | — | ✓ |
| 安全事件查看与处置 | — | — | — | — | ✓ | 查看与分析 |
| 黑名单管理 | — | — | — | — | — | ✓ |
| 报表、日志和管理首页 | — | — | — | — | — | ✓ |

认证失败返回 401；账号禁用或已认证但无权限返回 403。路径参数中的角色或 `userId` 不能替代登录身份。涉及本人数据的接口必须继续校验资源归属，不能只依赖前端隐藏入口。

## 4. 兼容原则

- 数据库表列改名不得直接改变现有前端 JSON 字段。
- 时间字段继续保持现有上海时间字符串或既有 ISO 会话时间语义，不能统一追加 `Z` 导致筛选和展示变化。
- 空数组、`null`、空字符串和省略字段具有不同既有语义，不进行全局归一化。
- 重复审批、幂等重放、黑名单冲突等接口保持现有业务状态码，不因文档清理改变行为。
