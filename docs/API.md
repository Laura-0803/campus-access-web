# 核心接口

所有浏览器接口经 Gateway 的 `/api` 前缀访问，响应保持现有 envelope。完整契约见 [api-contract.md](api-contract.md)，历史 68 接口核对表归档在 [archive/legacy/p5-final-api-inventory.md](archive/legacy/p5-final-api-inventory.md)。

|领域|核心路径|服务|
|---|---|---|
|认证与用户|`/api/auth/**`、`/api/users/**`、`/api/people/**`|user-service|
|人员附属信息|`/api/faces/**`、`/api/vehicles/**`、`/api/messages/**`|user-service|
|预约审批|`/api/appointments/**`|appointment-service|
|二维码与通行|`/api/qr-codes/**`、`/api/access-records/**`|access-service|
|设备与规则|`/api/devices/**`、`/api/gates/**`、`/api/access-rules/**`|access-service|
|异常与黑名单|`/api/exceptions/**`、`/api/blacklist/**`|exception-service|
|首页与报表|`/api/dashboard/**`、`/api/reports/**`|aggregation-service|
|健康检查|`/api/health`|aggregation-service|

内部 `/internal/**` 仅用于服务间调用和组件状态展示，依赖内部密钥，不是公开 API。人员删除继续禁用；本次清理未改变路由、权限、请求或响应契约。
