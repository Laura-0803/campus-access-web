import mysql from 'mysql2/promise';

const config = {
  host: process.env.CAMPUS_DB_HOST || '127.0.0.1',
  port: Number(process.env.CAMPUS_DB_PORT || 3306),
  user: process.env.CAMPUS_DB_USER || 'root',
  password: process.env.CAMPUS_DB_PASSWORD || 'root',
  database: process.env.CAMPUS_DB_NAME || 'campus_access'
};

try {
  const conn = await mysql.createConnection(config);
  console.log('Connected to DB', config.host, config.database);

  // Delete gates not in allowed list
  await conn.query("DELETE FROM gates WHERE id NOT IN ('GATE-E','GATE-S','GATE-W','GATE-N')");
  console.log('Removed extra gate rows.');

  // Update access_rules to use only the four gates where appropriate (store as JSON arrays)
  const fourArr = JSON.stringify(['东门','西门','南门','北门']);
  await conn.query("UPDATE access_rules SET gates = ? WHERE id IN ('RULE-TEACHER','RULE-ADMIN','RULE-GUARD','RULE-EMERGENCY')", [fourArr]);
  await conn.query("UPDATE access_rules SET gates = ? WHERE id IN ('RULE-VISITOR','RULE-CONTRACTOR','RULE-TEMP-VISITOR')", [JSON.stringify(['东门','南门'])]);
  await conn.query("UPDATE access_rules SET gates = ? WHERE id = 'RULE-ALUMNI'", [JSON.stringify(['东门','西门'])]);
  await conn.query("UPDATE access_rules SET gates = ? WHERE id = 'RULE-LOGISTICS'", [JSON.stringify(['东门'])]);
  await conn.query("UPDATE access_rules SET gates = ? WHERE id = 'RULE-CONSTRUCTION'", [JSON.stringify(['北门'])]);

  console.log('Updated access_rules entries.');

  const gateMap = [
    ['东二门', '东门'],
    ['南二门', '南门'],
    ['西二门', '西门'],
    ['北二门', '北门'],
    ['图书馆门', '西门'],
    ['宿舍区门', '东门'],
    ['实验楼门', '北门'],
    ['停车场入口', '南门']
  ];

  for (const [from, to] of gateMap) {
    await conn.query('UPDATE access_records SET gate = ? WHERE gate = ?', [to, from]);
    await conn.query('UPDATE exceptions SET gate = ? WHERE gate = ?', [to, from]);
  }
  console.log('Normalized historical gate names.');

  await conn.query("DELETE FROM devices WHERE gate NOT IN ('东门','西门','南门','北门')");
  console.log('Removed devices outside the four campus gates.');

  await conn.query("UPDATE blacklist SET reason = '车辆权限已停用' WHERE reason = '停车场权限已停用'");
  await conn.query("UPDATE logs SET target = 'D-NF-001' WHERE target = 'D-PARK-001'");
  await conn.query("UPDATE logs SET target = 'D-WQ-001', action = REPLACE(action, '图书馆扫码设备', '西门扫码设备') WHERE target = 'D-LIB-001' OR action LIKE '%图书馆扫码设备%'");

  await conn.end();
  process.exit(0);
} catch (err) {
  console.error('DB update failed:', err.message || err);
  process.exit(1);
}
