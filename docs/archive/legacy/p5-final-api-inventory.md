# 原68条API最终状态核对

## P7-A最终工程复核（2026-10-21）

P6已通过用户验收。最终归属仍为67 Java、0 Express、1禁用人员删除，无新增业务切换。已逐项核实67个Controller方法、Service调用、域内SQL/跨服务依赖、当前React挂载入口、浏览器实际HTTP观测及未覆盖分支，完整见[P7最终68行矩阵](p7-evidence/final-api-matrix.md)及[JSON](p7-evidence/final-api-matrix.json)。

本轮338项重叠功能断言、生产构建、全停冷启动、真实Edge及原数据保全见[p7-test-evidence.md](p7-test-evidence.md)。静态挂载、浏览器观察请求和实际按钮操作分开记录；未把67条处理归属解释为全部参数/历史场景都已测试。/profiles/me是现有/{role}控制器别名；新增内部API和撤码接口不计入原68分母。

保留P2验证码方案、P3停用被访人403、P4-B未知503及持久幂等恢复/无绑定503、P4-C单向状态与非法时间安全拒绝、P6分布式Health等已批准差异；不新增契约调整。以下P6/P5内容和原68行表保留历史依据，精确当前分支/页面证据以P7矩阵为准。

## P6当前状态（2026-10-20，仅隔离切换）

P5 A/B/F已经审核通过：API-004现在可由/scan-simulator页面操作，API-063已在/rules拥有验证面板，API-010/012有独立/account-status入口。下表相关“仅脚本/无活动页面”的旧描述为P5前置分析时点，以上述当前状态及P5前端验收为准。

API-001/036/037/053/054已由aggregation-service实现并隔离切Gateway；用户域黑名单已按批准直接Feign调用exception-service。Health分布式差异及真实测试见[p6-contract-comparison.md](p6-contract-comparison.md)、[P6验收](p6-acceptance.md)。Express停止后的生产React Edge流程已验证；未切正式数据库或流量。

当前68项机器清单为[p6-evidence/api-audit.json](p6-evidence/api-audit.json)，P5机器清单保持历史原样。

统计键为P0清单的HTTP Method＋原路径模式，分母68固定不变，不能把内部接口或新增撤码计入分子。现67/68=98.53%由Java处理；Express0；人员删除1/68=1.47%未实现。排除health后业务Java覆盖66/67=98.51%。这不是总体功能/页面/课程评分完成率；最终审批无绑定分支、HOLD人工恢复和真实短信送达等仍未完成。此前P5口径62/68保留在原阶段报告。

P5前置静态核对及历史机器清单见[p5-evidence/api-audit.json](p5-evidence/api-audit.json)，当时47条有页面调用候选、15条无入口；它们不是当前UI验收数量。P5已补A/B/F，P6未新增页面，按下表当前入口及实际Edge报告判定，不把67条Java一律记为页面通过。详细原参数/字段见[原契约](api-contract.md)，批准差异见各阶段及P6文档。

|ID|Method / 原URL|当前处理者|页面/API区别|差异及证据|
|---|---|---|---|---|
|API-001|GET /api/health|aggregation-service：HealthController.health|无业务页面直接调用；启停健康工具实际调用|已批准分布式store及位置null；五组件真实检查，[p6-contract-comparison.md](p6-contract-comparison.md)|
|API-002|GET /api/access-records|access-service：RecordsController.list|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-003|POST /api/access-records|access-service：RecordsController.create|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-004|POST /api/access-records/simulate|access-service：RecordsController.simulate|P5新增/scan-simulator，P6生产dist真实点击|P4安全核验；P4C非法时间拒绝；[p5-scan-simulator-test.md](p5-scan-simulator-test.md)|
|API-005|GET /api/people|user-service：PersonQueryController.list|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-006|GET /api/people/:id|user-service：PersonQueryController.one|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-007|POST /api/people|user-service：PersonAdminController.create|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-008|PATCH /api/people/:id|user-service：PersonAdminController.update|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-009|DELETE /api/people/:id|未迁移：无Java方法，隔离Gateway返回404|原删除按钮存在但后端禁用|无该接口专属新增差异；共用安全边界见阶段契约；[p2-delete-detailed-design.md](p2-delete-detailed-design.md)|
|API-010|GET /api/users|user-service：UserAdminController.list|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-011|POST /api/users|user-service：UserAdminController.create|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-012|PATCH /api/users/:id|user-service：UserAdminController.update|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-013|GET /api/appointments|appointment-service：AppointmentController.list|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p3-api-migration.md](p3-api-migration.md)|
|API-014|GET /api/appointments/hosts|appointment-service：AppointmentController.hosts|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p3-api-migration.md](p3-api-migration.md)|
|API-015|GET /api/appointments/:id|appointment-service：AppointmentController.one|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p3-api-migration.md](p3-api-migration.md)|
|API-016|POST /api/appointments|appointment-service：AppointmentController.create|存在已挂载页面调用；不等于全部UI分支实测|P3批准停用被访人403；[p3-api-migration.md](p3-api-migration.md)|
|API-017|PATCH /api/appointments/:id/review|appointment-service：AppointmentController.review|存在已挂载页面调用；不等于全部UI分支实测|P4批准未知503/持久重放200；无绑定人员仍503未完成；[p3-api-migration.md](p3-api-migration.md)|
|API-018|GET /api/roles|user-service：RoleController.roles|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-019|POST /api/auth/login|user-service：AuthController.login|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-020|POST /api/auth/send-code|user-service：AuthController.send|存在已挂载页面调用；不等于全部UI分支实测|P2批准验证码不泄露/正常无通道503；[p2-api-migration.md](p2-api-migration.md)|
|API-021|POST /api/auth/reset-code|user-service：AuthController.resetCode|存在已挂载页面调用；不等于全部UI分支实测|P2批准验证码不泄露/正常无通道503；[p2-api-migration.md](p2-api-migration.md)|
|API-022|POST /api/auth/reset-password|user-service：AuthController.reset|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-023|POST /api/auth/register-visitor|user-service：AuthController.register|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-024|POST /api/auth/logout|user-service：AuthController.logout|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-025|GET /api/auth/me|user-service：AuthController.me|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-026|PATCH /api/auth/password|user-service：AuthController.password|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-027|GET /api/faces|user-service：FaceController.list|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-028|POST /api/faces/upload|user-service：FaceController.upload|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-029|GET /api/vehicles|user-service：VehicleController.list|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-030|POST /api/vehicles|user-service：VehicleController.create|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-031|PATCH /api/vehicles/:id|user-service：VehicleController.update|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-032|DELETE /api/vehicles/:id|user-service：VehicleController.delete|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-033|GET /api/qr-codes|access-service：QrController.list|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-034|POST /api/qr-codes|access-service：QrController.create|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-035|POST /api/qr-codes/:id/verify|access-service：QrController.verify|仅脚本/内部客户端，当前无活动页面调用|P4安全核验；P4C批准非法时间拒绝；[p4-api-migration.md](p4-api-migration.md)|
|API-036|GET /api/dashboard/admin|aggregation-service：DashboardController.admin|生产dist管理员首页真实调用|原统计/排序兼容；多时点非全局快照，[p6-api-migration.md](p6-api-migration.md)|
|API-037|GET /api/dashboard/:role|aggregation-service：DashboardController.role|生产dist六角色首页/二维码/个人记录页面真实调用|原范围与字段兼容，[p6-api-migration.md](p6-api-migration.md)|
|API-038|GET /api/devices|access-service：ConfigurationController.devices|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-039|POST /api/devices|access-service：ConfigurationController.device|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-040|PATCH /api/devices/:id|access-service：ConfigurationController.deviceUpdate|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-041|DELETE /api/devices/:id|access-service：ConfigurationController.deviceDelete|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-042|GET /api/exceptions|exception-service：ExceptionController.list|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4c-api-migration.md](p4c-api-migration.md)|
|API-043|GET /api/exceptions/analysis|exception-service：ExceptionController.analysis|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4c-api-migration.md](p4c-api-migration.md)|
|API-044|POST /api/exceptions/chat|exception-service：ExceptionController.chat|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4c-api-migration.md](p4c-api-migration.md)|
|API-045|GET /api/exceptions/:id/analysis|exception-service：ExceptionController.single|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p4c-api-migration.md](p4c-api-migration.md)|
|API-046|GET /api/exceptions/:id|exception-service：ExceptionController.detail|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p4c-api-migration.md](p4c-api-migration.md)|
|API-047|PATCH /api/exceptions/:id|exception-service：ExceptionController.update|仅脚本/内部客户端，当前无活动页面调用|P4C批准受控状态/409/成功同键重放；[p4c-api-migration.md](p4c-api-migration.md)|
|API-048|POST /api/exceptions/:id/actions|exception-service：ExceptionController.action|存在已挂载页面调用；不等于全部UI分支实测|P4C批准受控状态/409/成功同键重放；[p4c-api-migration.md](p4c-api-migration.md)|
|API-049|GET /api/profiles/me|user-service：ProfileController.get|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-050|PATCH /api/profiles/me|user-service：ProfileController.update|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-051|GET /api/profiles/:role|user-service：ProfileController.get|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-052|PATCH /api/profiles/:role|user-service：ProfileController.update|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-053|GET /api/reports/summary|aggregation-service：ReportController.summary|生产dist统计页面真实调用|原分组/趋势兼容，[p6-api-migration.md](p6-api-migration.md)|
|API-054|GET /api/reports/access|aggregation-service：ReportController.access|真实HTTP/SQL验证；无新增页面|原status/gate及源顺序/root total兼容，[p6-api-migration.md](p6-api-migration.md)|
|API-055|GET /api/messages|user-service：MessageController.list|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-056|POST /api/messages|user-service：MessageController.create|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-057|PATCH /api/messages/:id|user-service：MessageController.update|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-058|DELETE /api/messages/:id|user-service：MessageController.delete|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-059|PATCH /api/messages/:id/read|user-service：MessageController.read|仅脚本/内部客户端，当前无活动页面调用|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
|API-060|GET /api/gates|access-service：ConfigurationController.gates|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-061|PATCH /api/gates/:id|access-service：ConfigurationController.gate|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-062|GET /api/access-rules|access-service：ConfigurationController.rules|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-063|POST /api/access-rules/validate|access-service：ConfigurationController.validate|P5新增/rules面板，P6生产dist真实点击|P4C非法时间拒绝保留，[p5-rule-validator-test.md](p5-rule-validator-test.md)|
|API-064|PATCH /api/access-rules/:id|access-service：ConfigurationController.rule|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4-api-migration.md](p4-api-migration.md)|
|API-065|GET /api/blacklist|exception-service：BlacklistController.list|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4c-api-migration.md](p4c-api-migration.md)|
|API-066|POST /api/blacklist|exception-service：BlacklistController.create|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4c-api-migration.md](p4c-api-migration.md)|
|API-067|PATCH /api/blacklist/:id|exception-service：BlacklistController.update|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p4c-api-migration.md](p4c-api-migration.md)|
|API-068|GET /api/logs|user-service：AuditController.list|存在已挂载页面调用；不等于全部UI分支实测|无该接口专属新增差异；共用安全边界见阶段契约；[p2-api-migration.md](p2-api-migration.md)|
