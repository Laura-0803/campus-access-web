// Schema only: no table records, account passwords, session tokens or QR payloads.
import fs from 'node:fs';
import { config as c, mysql } from './p7-http.mjs';
const domains = [
  ['用户服务', c.database, c.username, c.password],
  ['预约服务', c.appointmentDatabase, c.appointmentUser, c.appointmentPassword],
  ['通行服务', c.accessDatabase, c.accessUser, c.accessPassword],
  ['异常服务', c.exceptionDatabase, c.exceptionUser, c.exceptionPassword]
];
const quote = (s) => '`' + s.replaceAll('`', '``') + '`';
const snapshot = { capturedAt: new Date().toISOString(), timezone: 'Asia/Shanghai', host: c.host, port: c.port, domains: [] };
for (const [service, database, user, password] of domains) {
  if (c.host !== '127.0.0.1' || !/^campus_p(?:2_user|3_appointment|4_access|4c_exception)_\d{14}$/.test(database)) throw Error('Only current isolated schemas may be exported');
  const db = await mysql.createConnection({ host: c.host, port: c.port, user, password, database });
  try {
    const [tables] = await db.execute('SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_COLLATION, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME', [database]);
    const domain = { service, database, tables: [] };
    for (const t of tables) {
      const table = t.TABLE_NAME;
      const [columns] = await db.execute('SELECT ORDINAL_POSITION, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA, CHARACTER_SET_NAME, COLLATION_NAME, COLUMN_COMMENT, GENERATION_EXPRESSION FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION', [database, table]);
      const [indexes] = await db.query('SHOW INDEX FROM ' + quote(table));
      const [foreignKeys] = await db.execute('SELECT CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_TABLE_SCHEMA,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME,ORDINAL_POSITION FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY CONSTRAINT_NAME,ORDINAL_POSITION', [database, table]);
      const [ddl] = await db.query('SHOW CREATE TABLE ' + quote(table));
      domain.tables.push({ table, type: t.TABLE_TYPE, engine: t.ENGINE, collation: t.TABLE_COLLATION, comment: t.TABLE_COMMENT, columns, indexes: indexes.map(i => ({ name: i.Key_name, column: i.Column_name, sequence: i.Seq_in_index, unique: !i.Non_unique, type: i.Index_type, prefixLength: i.Sub_part })), foreignKeys, ddl: Object.values(ddl[0])[1] });
    }
    snapshot.domains.push(domain);
  } finally { await db.end(); }
}
const tableCount = snapshot.domains.reduce((n,d)=>n+d.tables.length,0), columnCount = snapshot.domains.reduce((n,d)=>n+d.tables.reduce((m,t)=>m+t.columns.length,0),0);
snapshot.summary = { databases: snapshot.domains.length, tables: tableCount, columns: columnCount };
fs.writeFileSync('docs/current-database-schema.json', JSON.stringify(snapshot, null, 2));
const cell = (v) => (v === null ? 'NULL' : String(v ?? '—')).replaceAll('|','\\|').replaceAll('\n','<br>');
const lines = ['# 智慧校园出入管理系统当前数据库表与字段清单', '', '采集日期：'+new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+'（Asia/Shanghai）。', '', `当前Java演示系统连接 ${c.host}:${c.port} 的4个独立隔离数据库，共${tableCount}张表、${columnCount}个字段。下表来自本次直接读取MySQL实际结构，包含业务表及验证码、幂等、签发、Outbox、Inbox、隔离故障测试等运行表。`, '', '本文仅列结构，不导出业务记录、密码值、Session或二维码Token。原Express业务数据库及旧实验/备份数据库不属于当前运行连接范围，未纳入本文。aggregation-service没有自己的数据库。', '', '## 数据库与表总览', '', '|所属服务|数据库|表数|字段数|', '|---|---|---:|---:|'];
for (const d of snapshot.domains) lines.push(`|${d.service}|${d.database}|${d.tables.length}|${d.tables.reduce((n,t)=>n+t.columns.length,0)}|`);
lines.push('', '|所属服务|表名|字段数|', '|---|---|---:|');
for (const d of snapshot.domains) for (const t of d.tables) lines.push(`|${d.service}|${t.table}|${t.columns.length}|`);
lines.push('', '## 字段说明口径', '', '“允许空值”对应IS_NULLABLE；键标识PRI为主键、UNI为唯一索引、MUL为非唯一索引中的字段；完整组合及唯一性以每表索引清单为准。默认值NULL是MySQL元数据返回值，可能表示未声明默认值或显式DEFAULT NULL，精确区别见文末DDL。数据库没有字段注释时显示“—”，不根据字段名称虚构业务含义。', '');
for (const d of snapshot.domains) {
  lines.push('## '+d.service, '', '数据库：`'+d.database+'`。', '');
  for (const t of d.tables) {
    lines.push('### '+t.table, '', `字段数：${t.columns.length}；引擎：${t.engine}；表排序规则：${t.collation}。`+(t.comment?' 表注释：'+t.comment:''), '', '|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|', '|---:|---|---|---|---|---|---|---|');
    for (const col of t.columns) lines.push('|'+[col.ORDINAL_POSITION,col.COLUMN_NAME,col.COLUMN_TYPE,col.IS_NULLABLE,col.COLUMN_DEFAULT,col.COLUMN_KEY||'—',col.EXTRA||'—',col.COLUMN_COMMENT||'—'].map(cell).join('|')+'|');
    const groups = new Map();
    for (const i of t.indexes) { if(!groups.has(i.name)) groups.set(i.name,[]);groups.get(i.name).push(i); }
    lines.push('', '索引：', '', '|索引名|类型|唯一|字段顺序|', '|---|---|---|---|');
    for (const [name,items] of groups) lines.push('|'+[name,items[0].type,items[0].unique?'是':'否',items.sort((a,b)=>a.sequence-b.sequence).map(x=>x.column+(x.prefixLength?'('+x.prefixLength+')':'')).join(', ')].map(cell).join('|')+'|');
    if(!groups.size) lines.push('|无|—|—|—|');
    lines.push('', '外键：'+(t.foreignKeys.length?t.foreignKeys.map(k=>`${k.CONSTRAINT_NAME}：${k.COLUMN_NAME} → ${k.REFERENCED_TABLE_NAME}.${k.REFERENCED_COLUMN_NAME}`).join('；'):'无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。'), '');
  }
}
lines.push('## 附录 实际建表语句', '', '以下为本次SHOW CREATE TABLE的原始结构输出，仅供核对；本次未执行任何建表或迁移语句。', '');
for(const d of snapshot.domains)for(const t of d.tables)lines.push('### '+d.database+'.'+t.table,'','```sql',t.ddl+';','```','');
fs.writeFileSync('docs/current-database-schema.md',lines.join('\n'));
console.log(JSON.stringify({summary:snapshot.summary,documents:['docs/current-database-schema.md','docs/current-database-schema.json'],databaseWrites:0}));
