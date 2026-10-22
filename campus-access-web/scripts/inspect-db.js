import mysql from 'mysql2/promise';
const conf = { host:'127.0.0.1', port:3306, user:'root', password:'root', database:'campus_access' };
(async () => {
  const conn = await mysql.createConnection(conf);
  const [gates] = await conn.query('SELECT id, name, campus, location, open_time, status FROM gates ORDER BY id');
  const [rules] = await conn.query('SELECT id, gates FROM access_rules ORDER BY id');
  console.log('GATES', gates.length);
  console.table(gates);
  console.log('RULES', rules.length);
  console.table(rules);
  await conn.end();
})();
