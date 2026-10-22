# 原API兼容契约（静态基线）

全量方法/路径/调用点/权限/状态码/服务归属见 api-inventory.csv；前端62个封装全部找到对应路由，另6条后端路由没有封装。CSV的 `query_local/body_local/response_expression` 是可定位的源码摘取，辅助函数的完整输入/对象字段以本文件与数据字典补齐；不是已执行的HTTP快照。尚无动态JSON黄金样例，P2-P6按CSV的API编号逐一验证。

## 传输契约

默认 `/api`，可由VITE_API_BASE_URL覆盖；Bearer认证，后端还兼容x-campus-token。成功200或created201：`{success:true,data,...meta}`，total实际在顶层，不是固定的嵌套meta对象。列表通常直接数组，不是分页Page对象；DataTable客户端分页，保留sort_order和各接口时间倒序语义。失败 `{success:false,error:{message,details}}`；details为undefined时JSON省略，不保证null。原路由主要400/401/403/404/409/429/500，不能因目标清单写了409就把所有重复审批改成409（原为400）。请求JSON最大10MB，人脸是JSON内imageUrl，不是现有multipart上传路由。

client只返回payload.data；非登录401会删除campus_session/campus_token/campus_user并发campus:auth-expired；其他错误触发campus:api-error。保持这些事件和campus_session恢复机制。列表空值为[]；实体有null、空字符串和省略字段三种情况。业务时间大多上海字符串，session时间ISO，不能统一序列化成带Z日期导致筛选/显示变化。

## 请求字段与返回DTO

以下路径省略/api。`?`表示可选字段；权限分支和字段必填组合见源路由。所有字段保持camelCase，数据库snake_case映射见database-fields.csv。字段为类型名时按后文DTO展开。

|接口|查询/请求体|data返回|
|---|---|---|
|GET /health|无|service,status,store(type,host,port,database,legacyTable,tables,user),dataFile；将来脱敏需明确契约|
|GET /roles|无|roles对象、roleProfiles对象|
|POST /auth/login|account或username,password|Session|
|POST /auth/send-code|phone|phone,code,expireMinutes（演示）|
|POST /auth/reset-code|account,phone|phone,code,expireMinutes（演示）|
|POST /auth/reset-password|account,phone,code,newPassword,confirmPassword|SafeUser|
|POST /auth/register-visitor|name,phone,idNumber,code,password,confirmPassword,company?|registered,phone,user:SafeUser,person:Person，201|
|POST /auth/logout|无|loggedOut|
|GET /auth/me|userId?,account?仅admin可选他人|Session（token仍为当前会话token）|
|PATCH /auth/password|oldPassword,newPassword,userId?|SafeUser|
|GET /appointments|status?,host?,visitor?,hostId?,visitorId?,visitorPhone?；后端覆盖本人范围|Appointment[]+total|
|GET /appointments/hosts|无|[{id,name,role,type,code,department}]+total|
|GET /appointments/:id|path id|Appointment|
|POST /appointments|host,hostId?,reason,visitStart,visitEnd?,visitor?,visitorPhone?,phone?,visitorId?,userId?,idNumber?；admin代录visitor/visitorPhone必填|Appointment，201|
|PATCH /appointments/:id/review|status=已通过或未通过,comment?|appointment:Appointment,qrCode:Qr或null|
|GET /access-records|status?,type?,gate?,method?,name?,keyword?,timeFrom?,timeTo?,limit?|Record[]+total（limit截断后的长度）|
|POST /access-records|name,type,method,gate,status,personId?,time?|Record，201|
|POST /access-records/simulate|credentialType?(默认qr),credentialValue或token,gate?(东门),method?|record:Record,qrCode:Qr或null,allowed,reason,rule:Rule或null；拒绝也200|
|GET /faces|userId?,personId?,role?（admin可代查）|Face[]+total|
|POST /faces/upload|userId?/personId?/role?管理员定位，fileName?,imageUrl?,slot?,label?|Face，201；slot仅primary/secondary|
|GET /vehicles|userId?,personId?,role?（普通人范围固定本人）|Vehicle[]+total|
|POST /vehicles|plateNo,ownerId(admin必填),status?,lastAccess?|Vehicle，201|
|PATCH /vehicles/:id|plateNo?,ownerId?(admin),status?,lastAccess?|Vehicle；lastAccess未在更新白名单，不因出现字段就自动支持|
|DELETE /vehicles/:id|path id|被删除Vehicle|
|GET /qr-codes|type?,status?,ownerName?|本人或门岗/admin可见Qr[]+total|
|POST /qr-codes|type?(admin),ownerId?/ownerName?(admin),appointmentId?(visitor必需),validFrom?,validTo?|Qr，201|
|POST /qr-codes/:id/verify|path id可为记录ID/Token/扫码载荷；body gate?,method?|qrCode:Qr,allowed,gate字符串,reason；不产生Record|
|GET /devices|status?,gate?|Device[]+total|
|POST /devices|name,type,gate,id?,status?|Device，201|
|PATCH /devices/:id|name?,type?,gate?,status?|Device|
|DELETE /devices/:id|path id|被删除Device|
|GET /exceptions|status?,risk?,person?|Exception[]+total|
|GET /exceptions/analysis|无|AnalysisSet|
|GET /exceptions/:id/analysis|path id|Analysis|
|GET /exceptions/:id|path id|Exception|
|POST /exceptions/chat|question,history?数组,context?对象|Dialogue（本地规则分析）|
|PATCH /exceptions/:id|status?,note?|Exception|
|POST /exceptions/:id/actions|action,note?,close?（false表示处理中，否则已处理）|Exception|
|GET /profiles/me、/profiles/:role|userId?；路径role是管理员定位回退|ProfileEnvelope|
|PATCH /profiles/me|userId?(admin),phone?,company?(仅visitor)|ProfileEnvelope|
|PATCH /profiles/:role|userId?,phone?,status?|ProfileEnvelope|
|GET /people|type?,keyword?|Person[]+total|
|GET /people/:id|path id|Person|
|POST /people|name,type,role,code,idNumber,phone；按类型必填college/className/company/host/gate/department等；id?,status?,position?,graduationYear?,major?|Person，201|
|PATCH /people/:id|Person可编辑白名单，id不更新|Person|
|DELETE /people/:id|path id|被删除Person，同时清账号/会话/人脸/车辆/QR|
|GET /users|role?|SafeUser[]+total|
|POST /users|username,password,role,personId,accountType?,id?,status?|SafeUser，201|
|PATCH /users/:id|username?,password?,role?,personId?,accountType?,status?|SafeUser|
|GET /dashboard/admin|无|summary,stats,accessTrend,riskData,realtimeRecords,exceptions,appointments,devices|
|GET /dashboard/:role|path role,userId?(普通人必须本人)|role,user:SafeUser或null,profile,person,cards,appointments,records,vehicle,face,faces,qrCode,exceptions|
|GET /reports/summary|无|access(total,byStatus,byType,byGate),appointments(total,byStatus),exceptions(total,byRisk,byStatus),devices(total,byStatus),accessTrend,riskData|
|GET /reports/access|status?,gate?|Record基础数组+total（此路由未补personCode）|
|GET /messages|role?(admin),read?|Message[]+total，过滤旧预约通知|
|POST /messages|title,content,targetRoles或targetRole?默认all|Message带targetRoles，201|
|PATCH /messages/:id|title?,content?,targetRoles?/targetRole?|Message带targetRoles|
|DELETE /messages/:id|path id|被删除Message原对象（未保证补targetRoles）|
|PATCH /messages/:id/read|read?默认true|Message原对象；read_flag目前共享|
|GET /gates|无|Gate[]+total，按东/南/西/北既定顺序|
|PATCH /gates/:id|name?,campus?,location?,openTime?,status?|Gate；同步同门设备维护状态|
|GET /access-rules|无|Rule[]+total，角色别名规范化，gates为顿号文本|
|POST /access-rules/validate|credentialType?,credentialValue或token,gate?,method?|allowed,reason,credentialType,method,person简表或null,gate简表或null,rule简表或null；只读不落记录|
|PATCH /access-rules/:id|methods?,allowedTime?,gates?,status?|Rule原对象，gates可能数组；不能强制所有接口同一种类型|
|GET /blacklist|status?,type?,keyword?|仅生效/启用Blacklist[]+total|
|POST /blacklist|credentialNo,type?,name?,reason?,status?|Blacklist，实际200|
|PATCH /blacklist/:id|status?,reason?,removedReason或removeReason?（已移出时必需）|Blacklist，补removedAt/removedBy|
|GET /logs|role?,actor?|Log[]+total|

## DTO字段展开与特殊类型

Person = id,name,type,code,idNumber,role,college,className,phone,faceStatus,status,department,position,host,company,graduationYear,major,gate。SafeUser = id,username,accountType,role,personId,status（排除password）。Profile = personId,name,title,role,type,avatar,status，可附code/phone/gate（dashboard）；Session={token,user,profile,person}；ProfileEnvelope={user,profile,person}。

Appointment = id,visitor,visitorId,visitorPhone,idNumber,host,hostId,time,visitStart,visitEnd,reason,status,createdAt,reviewedAt,reviewer,reviewComment。Record=id,time,name,personId,type,method,gate,status，核验/列表/dashboard补personCode；Qr=id,token,type,ownerName,ownerId,visitorId,appointmentId,validFrom,validTo,status。maxUses/usedCount是残留存储列，不在旧store读取DTO。

Face=id,personId,personName,status,fileName,imageUrl,slot,label,updatedAt。Vehicle=id,ownerId,ownerName,plateNo,status,lastAccess。Device=id,name,type,gate,status。Gate=id,name,campus,location,openTime,status。Rule=id,role,methods,allowedTime,gates,status；methods为数组或兼容文本，gates按接口可能数组/顿号字符串。

Exception=id,time,person,personType,gate,method,type,reason,risk,status,suggestion,handler,handledAt,note,actions；actions为[{action,handler,note,createdAt}]。Blacklist=id,name,type,credentialNo,reason,status,createdAt,removedAt,removedReason,removedBy。Log=id,time,actor,role,action,target,result。Message=id,title,content,targetRole,read,createdAt，GET/创建/编辑补targetRoles数组。

聚合图表/Analysis/Dialogue字段有分支，除数据字典外必须参考 server/routes/dashboard.js、reports.js 及 server/lib/exceptionAgent.js 的实际对象构造；字段提取详情见 api-response-fields.md。迁移后对所有分支捕获脱敏JSON快照做结构比对，不能把本静态清单当作HTTP测试通过。路由顺序已核对：appointments/hosts 在 :id 前，exceptions/analysis 在 :id 前，profiles/me 在 :role 前，dashboard/admin 在 :role 前。
