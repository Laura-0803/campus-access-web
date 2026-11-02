# P4-B二维码签发设计（当前实现）

用户已批准：同步成功仍为原200及appointment、qrCode；接纳后未知使用503原错误包装和指定未确认文案；重复请求复用持久操作，确认成功才重放200。未知不得声称成功/失败，不自动撤销可能已有效的二维码。原审批过程及初始设计完整保存在[p4原方案归档](p4-evidence/input/p4-qr-issuance-design-proposal.md)，不得把其中实施前描述当作当前状态。

当前已实现并真实验证已绑定人员完整链路。默认public开关false保留P3保护；先受保护内部链路验证，再仅在私有隔离配置启用public最终分支。未绑定人员仍503，不向客户端返回null码假成功。

## 持久协议

appointment_issuance以appointmentId和operationId唯一，规范请求摘要、expectedVersion、actorId、AES-GCM加密原会话、lease/attempts/hold_reason持久化。接纳时锁预约并校验管理员实时权限和状态；网络调用在事务外。access以唯一签发槽prepare安全随机预备码；已有码必须人员/类型/窗口完全绑定，冲突拒绝。预约决议、历史和下一步任务本地事务提交为DECIDED；activate查询权威纯决议接口再锁槽激活，避免递归调用链。确认真实有效码且预约仍批准后才记SUCCEEDED并200。

恢复先查询原命令后重发幂等命令，租约/CAS防并发覆盖；每次重新校验原actor会话、实时角色、黑名单和预约状态。撤权/预约变化/绑定冲突HOLD，不绕过授权继续。HOLD只提供受保护状态查询，人工恢复界面未实现。access所有核验实时验证人员/预约/规则，故障拒绝。

凭证撤销保留唯一槽和墓碑，重试不复活；核验和激活READ_COMMITTED行锁后重读，防止RR快照用旧状态放行。不实施人员删除Saga，也不直接跨库写表。两个本地事务不能保证全局原子性，未知状态及潜在部分提交显式保留。

实际故障矩阵、日志与未测试场景见[p4-qr-consistency-test.md](p4-qr-consistency-test.md)。并非所有机器指令点均已故障穷举；已测试回执丢失、真实SQL失败、JVM崩溃、权限/预约变更及并发撤销。
