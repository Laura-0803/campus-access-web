// Never import legacy store. Administrative writes only target unique P1 schemas/accounts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'campus-access-web/package.json'));
const mysql=require('mysql2/promise');
const env={...process.env};
for(const line of fs.readFileSync(path.join(root,'campus-access-web/.env'),'utf8').split(/\r?\n/)) {
 const m=line.trim().match(/^([^#=]+)=(.*)$/);if(m&&env[m[1].trim()]===undefined) env[m[1].trim()]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');
}
const config={host:env.CAMPUS_DB_HOST||'127.0.0.1',port:Number(env.CAMPUS_DB_PORT||3306),user:env.CAMPUS_DB_USER||'root',password:env.CAMPUS_DB_PASSWORD||'root',connectTimeout:5000};
const original=env.CAMPUS_DB_NAME||'campus_access';
const locations=JSON.parse(fs.readFileSync(path.join(root,'.p1-local/backup-location.json'),'utf8'));
const snapshot=JSON.parse(fs.readFileSync(path.join(locations.directory,'database-snapshot.json'),'utf8'));
const stamp=new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
const restoreName='campus_p1_restore_'+stamp;
const labName='campus_p1_lab_'+stamp;
const username='p1_lab_'+crypto.randomBytes(5).toString('hex');
const password=crypto.randomBytes(24).toString('hex');
const quote=s=>'`'+s.replaceAll('`','``')+'`';
const canonical=v=>JSON.stringify(v,(_,value)=>value && !Array.isArray(value) && typeof value==='object' && !(value instanceof Date) ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))) : value);
const hash=v=>crypto.createHash('sha256').update(canonical(v)).digest('hex');
async function fingerprint(c,db){
 const [tables]=await c.query('SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA=? AND TABLE_TYPE=\'BASE TABLE\' ORDER BY TABLE_NAME',[db]);
 const result=[];
 for(const r of tables){const [rows]=await c.query('SELECT * FROM '+quote(db)+'.'+quote(r.TABLE_NAME));const [ddl]=await c.query('SHOW CREATE TABLE '+quote(db)+'.'+quote(r.TABLE_NAME));result.push({table:r.TABLE_NAME,count:rows.length,rowsHash:hash(rows.map(canonical).sort()),ddlHash:hash(ddl[0]['Create Table'])});}
 return result;
}
let admin,target;
try {
 admin=await mysql.createConnection(config);
 const [version]=await admin.query('SELECT VERSION() AS version');
 const before=await fingerprint(admin,original);
 for(const db of [restoreName,labName]) {
  if(!/^campus_p1_(restore|lab)_\d{14}$/.test(db)||db===original) throw Error('Unsafe target');
  await admin.query('CREATE DATABASE '+quote(db)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 }
 target=await mysql.createConnection({...config,database:restoreName});
 await target.query('SET FOREIGN_KEY_CHECKS=0');
 for(const t of snapshot.tables){
  if(!/^\w+$/.test(t.table)||!t.ddl.startsWith('CREATE TABLE `'+t.table+'`')||/\b(?:USE|DROP DATABASE)\b/i.test(t.ddl)) throw Error('Unsafe DDL');
  await target.query(t.ddl);
 }
 await target.beginTransaction();
 for(const t of snapshot.tables){
  for(const row of t.rows){
   const keys=Object.keys(row); const values=keys.map(k=> {
    const v=row[k];if(v&&typeof v==='object') return JSON.stringify(v);
    if(typeof v==='string' && /(?:timestamp|datetime)/i.test(t.ddl.split('\n').find(l=>l.includes('`'+k+'`'))||'') && /^\d{4}-.*Z$/.test(v)) return new Date(v);
    return v;
   });
   await target.query('INSERT INTO '+quote(t.table)+' ('+keys.map(quote).join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')',values);
  }
 }
 await target.commit();
 await target.query('SET FOREIGN_KEY_CHECKS=1');
 const restored=[];
 for(const t of snapshot.tables){
  const [rows]=await target.query('SELECT * FROM '+quote(t.table));
  const equal=hash(rows.map(canonical).sort())===hash(t.rows.map(canonical).sort());
  restored.push({table:t.table,expectedRows:t.rows.length,restoredRows:rows.length,fullFieldHashMatch:equal});
  if(!equal) throw Error('Restore comparison failed for '+t.table);
 }
 // A restricted account for synthetic CRUD, with no grants to original or restored data.
 await admin.query('CREATE USER ?@\'localhost\' IDENTIFIED BY ?',[username,password]);
 await admin.query('GRANT SELECT, INSERT, UPDATE, DELETE ON '+quote(labName)+'.* TO ?@\'localhost\'',[username]);
 await admin.query('CREATE TABLE '+quote(labName)+'.lab_items (id BIGINT PRIMARY KEY AUTO_INCREMENT, label VARCHAR(100) NOT NULL) ENGINE=InnoDB');
 const credentials={host:config.host,port:config.port,database:labName,username,password,restoreDatabase:restoreName};
 fs.writeFileSync(path.join(root,'.p1-local/database.json'),JSON.stringify(credentials,null,2));
 const limited=await mysql.createConnection({...config,user:username,password,database:labName});
 let originalDenied=false;
 try {await limited.query('SELECT COUNT(*) FROM '+quote(original)+'.users');} catch(e){originalDenied=['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code);}
 await limited.end();
 if(!originalDenied) throw Error('Lab user isolation not proven');
 const after=await fingerprint(admin,original);
 const unchanged=hash(before)===hash(after);
 if(!unchanged) throw Error('Original database changed during restore interval');
 const report={mysqlVersion:version[0].version,restoreDatabase:restoreName,labDatabase:labName,restoredTables:restored,restore:'pass',originalDatabaseBefore:before,originalDatabaseAfter:after,originalDatabaseUnchanged:unchanged,labUserCannotReadOriginal:true,productionWritesByScript:0,labTable:'lab_items',sensitiveRowsInReport:false};
 fs.writeFileSync(path.join(root,'docs/p1-database-restore.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({restore:'pass',tables:restored.length,totalRows:restored.reduce((n,t)=>n+t.restoredRows,0),originalUnchanged:unchanged,labIsolation:originalDenied}));
} catch(e){console.error(JSON.stringify({status:'failed',code:e.code||e.message}));process.exitCode=1;}
finally {if(target) await target.end();if(admin) await admin.end();}
