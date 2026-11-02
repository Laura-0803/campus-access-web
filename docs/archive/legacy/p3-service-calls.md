# P3服务调用（当前整理）

P3已真实实现：GET /internal/appointment-context查询身份、hosts和本人范围；POST /internal/appointment-resolve在创建/审核时验证实时用户、被访人及权限。由OpenFeign按user-service服务名，经Eureka和真实Ribbon发现。P3双实例采样及故障证据保留。

创建非空证件与审核通过前调用隔离legacy-bridge的POST /internal/blacklist-check，真实读取其自有黑名单，异常503拒绝写入；不是永远通过的Mock。审计outbox发送POST /internal/appointment-audits，稳定事件ID幂等，失败保留待重试。

401/403等业务拒绝经HystrixBadRequestException不计为基础设施故障；网络故障fallback不可用，业务层503。真实测试区分失败、fallback、open、短路及恢复。内部接口密钥保护，身份接口另校验Token；Gateway剥离伪造身份头。

Express业务到Java预约投影是只读SQL，不反向请求用户；黑名单专用处理器不调用预约投影，避免递归。P3无QR签发、无跨库写。P4新增access协议另见p4-qr-issuance-design.md。历史原稿位于p4-evidence/input/docs/p3-service-calls.md。
