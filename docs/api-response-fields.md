# 聚合/分析响应字段索引

这是完整源文件对象键的辅助索引，按构造函数分段；包含内部变量键，不等同于所有字段必然出现在响应。已在api-contract.md定义稳定业务DTO，动态分支待HTTP黄金样例验证。

## server/routes/dashboard.js

- `resolveContext`（L27）：code, gate, name, personId, phone, role, status, type
- `adminSummary`（L125）：accessTotal, alumniAccess, appointmentTotal, deviceTotal, exceptionTotal, pendingAppointments, pendingExceptions, todayAccess
- `adminStats`（L153）：desc, title, type, value
- `accessTrend`（L191）：count, day, exceptions
- `riskData`（L206）：value
- `guardDashboardCards`（L228）：badge, desc, title, type, value
- `studentDashboardCards`（L271）：badge, desc, title, type, value
- `teacherDashboardCards`（L303）：badge, desc, title, type, value
- `visitorDashboardCards`（L334）：badge, desc, title, type, value
- `alumniDashboardCards`（L359）：badge, desc, title, type, value
- `roleDashboardCards`（L383）：primary, secondary
- `normalizeFace`（L399）：accessTrend, accountType, appointments, devices, exceptions, face, id, label, personId, realtimeRecords, riskData, role, stats, status, user, username

文件中全部显式对象键：accessTotal, accessTrend, accountType, alumniAccess, appointmentTotal, appointments, badge, code, count, day, desc, deviceTotal, devices, exceptionTotal, exceptions, face, gate, id, label, name, pendingAppointments, pendingExceptions, personId, phone, primary, realtimeRecords, riskData, role, secondary, stats, status, title, todayAccess, type, user, username, value

## server/routes/reports.js

- `accessTrend`（L33）：count, day, exceptions
- `riskData`（L47）：access, accessTrend, appointments, byGate, byRisk, byStatus, byType, devices, exceptions, riskData, total, value

文件中全部显式对象键：access, accessTrend, appointments, byGate, byRisk, byStatus, byType, count, day, devices, exceptions, riskData, total, value

## server/lib/exceptionAgent.js

- `recurrenceScore`（L68）：score
- `analyzeException`（L83）：adminFocus, conclusion, evidence, id, mode, model, name, size, version
- `analyzeExceptionSet`（L130）：byRisk, byStatus, highRisk, hotGates, hotTypes, mode, model, modelPath, name, pending, summary, total, version
- `dateParts`（L173）：day, month, year
- `currentShanghaiMs`（L210）：day, hour, hour12, minute, month, second, timeZone, year
- `recentDaysRange`（L242）：endMs, label, startMs
- `thisMonthRange`（L252）：endMs, label, startMs
- `rangeMeta`（L284）：end, label, start
- `rowsInQuestionRange`（L327）：rows
- `compactException`（L358）：gate, id, person, reason, risk, status, time, type
- `buildResult`（L372）：columns, dataSource, id, mode, model, name, role, rows, suggestions, version
- `answerHelp`（L395）：answer, intent
- `answerHotGate`（L403）：answer, columns, count, exportFileName, gate, highRisk, intent, latestTime, pending, range, rows
- `answerRiskOrStatus`（L438）：answer, columns, exportFileName, intent, range, rows
- `answerReason`（L464）：answer, columns, exportFileName, intent, range, rows
- `answerSuggestion`（L490）：answer, columns, exportFileName, intent, range, rows
- `answerSingleException`（L524）：answer, columns, exportFileName, intent, predictedRisk, rootCause, rows, score
- `answerDistribution`（L565）：answer, columns, count, exportFileName, intent, name, range, ratio, rows
- `answerTrend`（L600）：answer, columns, exportFileName, intent, range, rows
- `answerSearch`（L632）：answer, columns, exportFileName, intent, range, rows
- `answerOverview`（L662）：answer, columns, exportFileName, intent, range, rows
- `answerExceptionDialogue`（L680）：answer, intent

文件中全部显式对象键：adminFocus, answer, byRisk, byStatus, columns, conclusion, count, dataSource, day, end, endMs, evidence, exportFileName, gate, highRisk, hotGates, hotTypes, hour, hour12, id, intent, label, latestTime, minute, mode, model, modelPath, month, name, pending, person, predictedRisk, range, ratio, reason, risk, role, rootCause, rows, score, second, size, start, startMs, status, suggestions, summary, time, timeZone, total, type, version, year

