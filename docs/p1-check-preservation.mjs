// Final read-only comparison to P0 source and P1 pre-restore production fingerprints.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'campus-access-web/package.json'));const mysql=require('mysql2/promise');
const env={...process.env};
for(const line of fs.readFileSync(path.join(root,'campus-access-web/.env'),'utf8').split(/\r?\n/)){const m=line.trim().match(/^([^#=]+)=(.*)$/);if(m&&env[m[1].trim()]===undefined)env[m[1].trim()]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}
const quote=s=>'`'+s.replaceAll('`','``')+'`';
const canonical=v=>JSON.stringify(v,(_,value)=>value&&!Array.isArray(value)&&typeof value==='object'&&!(value instanceof Date)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
const hash=v=>crypto.createHash('sha256').update(canonical(v)).digest('hex');
const initial=JSON.parse(fs.readFileSync(path.join(root,'docs/p1-database-restore.json'),'utf8'));
const p0=JSON.parse(fs.readFileSync(path.join(root,'docs/backup-manifest.json'),'utf8'));
const preserved=JSON.parse(fs.readFileSync(path.join(root,'.p1-local/backup-location.json'),'utf8'));
const output=path.resolve(root,process.argv[2]||'docs/p1-evidence/preservation-check.json');
if(!output.startsWith(path.join(root,'docs')+path.sep)) throw Error('Evidence output must stay in docs');
const db=env.CAMPUS_DB_NAME||'campus_access';let c;
try {
 c=await mysql.createConnection({host:env.CAMPUS_DB_HOST||'127.0.0.1',port:Number(env.CAMPUS_DB_PORT||3306),user:env.CAMPUS_DB_USER||'root',password:env.CAMPUS_DB_PASSWORD||'root',database:db});
 await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
 const result=[];
 for(const t of initial.originalDatabaseBefore){const [rows]=await c.query('SELECT * FROM '+quote(t.table));const [ddl]=await c.query('SHOW CREATE TABLE '+quote(t.table));result.push({table:t.table,count:rows.length,rowsHash:hash(rows.map(canonical).sort()),ddlHash:hash(ddl[0]['Create Table'])});}
 await c.rollback();
 const unchanged=hash(result)===hash(initial.originalDatabaseBefore);
 const fileHash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const backupChecks=[{name:'original-project.zip',source:p0.sourceArchive,expected:p0.sha256},{name:'database-snapshot.json',source:p0.databaseBackup.path,expected:p0.databaseBackup.sha256}].map(x=>({name:x.name,originalUnchanged:fileHash(x.source)===x.expected,longTermCopyMatches:fileHash(path.join(preserved.directory,x.name))===x.expected}));
 const lab=JSON.parse(fs.readFileSync(path.join(root,'.p1-local/database.json'),'utf8'));
 if(!/^campus_p1_lab_\d{14}$/.test(lab.database)||!lab.username.startsWith('p1_lab_'))throw Error('Unsafe lab target');
 const limited=await mysql.createConnection({host:lab.host,port:lab.port,user:lab.username,password:lab.password,database:lab.database});
 const denied={};
 for(const database of [db,lab.restoreDatabase]) {
  try {await limited.query('SELECT COUNT(*) FROM '+quote(database)+'.users');denied[database]=false;}
  catch(error){denied[database]=['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(error.code);}
 }
 const [items]=await limited.query('SELECT COUNT(*) AS count FROM lab_items');await limited.end();
 const report={originalDatabaseUnchanged:unchanged,tables:result,backupChecks,productionWritesByThisScript:0,labIsolation:{labDatabase:lab.database,deniedRead:denied,remainingSyntheticRows:items[0].count,pass:Object.values(denied).every(Boolean)}};
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 if(!unchanged||backupChecks.some(x=>!x.originalUnchanged||!x.longTermCopyMatches)||!report.labIsolation.pass)throw Error('Preservation verification failed');
 console.log(JSON.stringify({originalDatabaseUnchanged:unchanged,comparedTables:result.length,backupChecks}));
}catch(e){console.error(e.code||e.message);process.exitCode=1;}finally{if(c)await c.end();}
