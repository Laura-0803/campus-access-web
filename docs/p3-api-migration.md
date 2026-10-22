# P3五条预约API逐项状态

原提示缺失的路径参数以P0清单和源代码还原`:id`；GET /appointments/是列表的尾斜杠兼容，不代替详情接口。统一前缀/api、Bearer及x-campus-token、camelCase、中文状态、200包装及列表顶层total保留。原请求字段/DTO见[原契约](api-contract.md)，特殊行为见[状态机](p3-state-machine.md)。

|API|原路径/方法|Java方法/Mapper|权限|实现/编译/启动/真实测试|差异和停止点|
|---|---|---|---|---|---|
|API-013|GET /api/appointments|AppointmentController.list→Queries.list→AppointmentMapper.list|student/teacher仅被访人范围，visitor本人，admin全部；alumni/guard403|已实现；实际结果见测试证据|状态/host/visitor/hostId/visitorId/visitorPhone过滤，visitorId提前return的旧语义保留；内部scope参数不接受客户端覆盖|
|API-014|GET /api/appointments/hosts|AppointmentController.hosts→Feign用户目录→user MyBatis|student/teacher/visitor/admin|已实现；实际结果见测试证据|原字段id/name/role/type/code/department，不擅自过滤停用Person|
|API-015|GET /api/appointments/:id|AppointmentController.one→AppointmentMapper.one|admin全部；hostId或姓名回退；visitorId/电话/姓名回退|已实现；实际结果见测试证据|不存在404，无权403；未增加原React不存在的详情弹窗|
|API-016|POST /api/appointments|AppointmentController.create→Commands.create→Mapper.insert/insertHistory/insertOutbox|visitor/admin|已实现/已编译/已启动/已真实测试|已批准停用被访人403；201保留13字段、省略审核字段，失败包装保留|
|API-017|PATCH /api/appointments/:id/review|AppointmentController.review→Commands.review→Mapper.lock/transition/insertHistory/insertOutbox|student/teacher/admin|非最终分支已实现/编译/启动/真实测试；最终批准等待P4|host通过/拒绝、admin拒绝200且qrCode:null；admin最终批准503不提交，按已批准方案A|

原列表过滤细节：student/teacher强制hostId本人，删除visitorId/visitorPhone但保留其他筛选；visitor强制visitorId本人、phone（有值时）本人、移除hostId；visitorId非空时先判断行visitorId，否则用当前人员phone/name兼容旧行，忽略visitorPhone条件。列表与详情回退规则并不相同。SQL使用参数绑定/BINARY/INSTR，不能把百分号当通配符。

原创建：admin先必填visitor/visitorPhone/host/reason/visitStart，即使随后绑定人员覆盖姓名电话；visitor只需host/reason/visitStart，身份来自真实账号。host按ID/编号匹配，不能按姓名，hostId与host冲突时原people列表顺序决定首次命中，不擅自发明优先级。visitor的idNumber优先人员原档，admin可选userId/visitorId绑定，黑名单标准化去空白大写；空证件跳过检查。原代码不强制管理员绑定对象必须visitor角色。visitEnd缺省空串；非法非空end可被原代码接受，开始epoch0被拒绝；原流程不验证开始必须未来时间。

原创建POST立即返回新对象，未设置的reviewedAt/reviewer/reviewComment被省略；以后GET从SQL读取null，已真实验证。原审核成功返回appointment+qrCode，缺省comment空串；有visitorId的最终批准通常必须有真实QR，此处没有用null替代成功，而是503不提交。

4条dashboard/reports聚合仍在隔离Express，读取Java预约投影；通行、异常及二维码业务未迁移。P2人员DELETE继续无实现、无开放，未实施删除Saga。五条预约请求不落旧Express，但只读部分可用不等于全部预约功能切换完成。
