# P1 Hystrix 真实故障、熔断与恢复

结果：通过。先通过Ribbon双实例分流，随后真正停止18811/18812两个自建提供者进程；没有forceOpen、模拟网络结果或手工调用markSuccess/allowRequest。

|阶段|真实证据|
|---|---|
|正常|20次Gateway→Feign调用均200、fallback=false，随后state=CLOSED|
|远程失败|累计FAILURE=10，TIMEOUT=0；逐次HTTP响应和断路器快照保留|
|fallback|响应明确fallback=true；FALLBACK_SUCCESS=10。HTTP200仅代表实验降级包装，不等于真实业务成功|
|真正开路|open=true/state=OPEN，健康窗口requests=20、errors=10|
|短路|SHORT_CIRCUITED增加到2，没有远程执行也返回fallback；此项与普通远程失败分开|
|允许探测|sleepWindow=3000ms；实际探测门从1792389013216推进到1792389031060|
|单探测在执行|open=true、并发执行=1，真实提供者已恢复，identity仅在恢复实验配置600ms延迟以观察过程|
|成功关闭|探测响应200/fallback=false；随后open=false/state=CLOSED，errors=0|
|持续恢复|其后4次请求均200且fallback=false|

## 半开状态的准确含义

实际Hystrix1.5.18实现只有AtomicBoolean circuitOpen和AtomicLong circuitOpenedOrLastTestedTime，没有独立HALF_OPEN枚举。此处“半开”指sleepWindow后由真实门控允许的单次探测。OPEN_PROBE_IN_FLIGHT是**诊断描述**，并非伪造的框架原生枚举：其证据同时要求真实open标志、推进的原子时间门、执行中计数和随后远程成功/断路器关闭。诊断只读私有时间门，不改变任何状态，代码和本机JAR已核对。

失败、降级、真正开路、短路和成功恢复分别有指标；不能只看fallback判断。计数以实际指标采集起点及滚动窗口为准，不当作全生命周期业务统计。探测门、各次响应、错误计数和恢复轮询见完整运行JSON tests.hystrixOutage/tests.hystrixRecovery，原始本轮文件：[p1-evidence/resume-20261019T054859528641Z-full/live-results.json](p1-evidence/resume-20261019T054859528641Z-full/live-results.json)。

限制：阈值3次/50%、3秒休眠窗和600ms观测延迟是本机实验设置，不是生产参数；私有字段读取绑定已锁定1.5.18，只放在实验诊断中。
