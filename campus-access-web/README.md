# 智慧校园出入管理信息系统

## 技术栈

- React 18 + Vite
- Tailwind CSS
- Express
- MySQL 8
- Recharts / React Flow / Lucide React

## 数据库

后端已连接 MySQL，默认配置为：

```text
host: 127.0.0.1
port: 3306
database: campus_access
user: root
password: root
table: app_state
```

启动后端时会自动创建 `campus_access` 数据库和 `app_state` 表。建表 SQL 也放在：

```text
server/db/schema.sql
```

如需修改数据库连接，可通过环境变量设置，参考 `.env.example`。

## 异常分析智能体

异常事件分析页内置专用对话智能体，接口为 `/api/exceptions/chat`。它只分析异常事件，支持总体异常分析、单个异常编号分析、异常高发校门、风险分布、待处理明细、趋势、原因归因和处置建议。

智能体直接基于 MySQL 实时异常事件表计算结果，不依赖 DeepSeek、Ollama 或其他外接大模型，因此回答速度稳定，导出 CSV 也只来自数据库真实记录。

## 运行方式

```bash
npm install
npm run dev:full
```

`dev:full` 会同时启动 Express 后端和 Vite 前端。

## 演示账号

- 学生：`2023210001 / 012026`
- 教职工：`T20260101 / 022026`
- 校友：`ALU20190001 / 032026`
- 门岗安保：`G2026001 / 042026`
- 保卫处管理员：`A2026001 / 052026`

访客可在登录页使用手机号、验证码和密码注册，演示验证码为 `888888`。

## 功能说明

系统按身份自动识别角色并展示对应菜单，包含学生、教职工、访客、校友、门岗安保和保卫处管理员功能：

- 多源身份认证通行
- 访客预约与动态二维码
- 校友二维码通行
- 出入核验与自动登记
- 异常事件风险分级
- 异常处理辅助智能体
- 用户与权限管理
- 人员信息管理
- 通行规则、黑名单、设备、日志和报表管理
