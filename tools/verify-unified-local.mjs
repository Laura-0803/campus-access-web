import fs from 'node:fs';
import mysql from '../campus-access-web/node_modules/mysql2/promise.js';
const env=Object.fromEntries(fs.readFileSync('campus-access-web/.env','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
for(const p of ['IDENTITY','APPOINTMENT','PASSAGE','INCIDENT']){
 const url=new URL(env[p+'_DB_URL'].replace('jdbc:',''));
 if(url.pathname!='/campus_access_dev')throw Error('Different database for '+p);
 const db=await mysql.createConnection({host:url.hostname,port:Number(url.port),user:env[p+'_DB_USERNAME'],password:env[p+'_DB_PASSWORD'],database:url.pathname.slice(1)});
 const [tables]=await db.query('SHOW TABLES');if(tables.length!==18)throw Error('Expected 18 tables');
 const [roles]=await db.query('SELECT COUNT(*) n FROM passage_rule p LEFT JOIN role_definition r ON p.role_code=r.role_code WHERE r.role_code IS NULL');if(roles[0].n)throw Error('Orphan rule role');
 const [gates]=await db.query('SELECT COUNT(*) n FROM access_device d LEFT JOIN campus_gate g ON g.id=d.gate_id WHERE g.id IS NULL');if(gates[0].n)throw Error('Orphan device gate');
 console.log(p,'connected to campus_access_dev; 18 tables; references valid');await db.end();
}
