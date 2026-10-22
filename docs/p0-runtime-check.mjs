// P0: imports no store/route modules. DB operations are SELECT/SHOW/read-only transaction.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const docs=path.dirname(fileURLToPath(import.meta.url));
const app=path.resolve(docs,'../campus-access-web');
const require=createRequire(path.join(app,'package.json'));
const parser=require('@babel/parser');
const mysql=require('mysql2/promise');
const env={...process.env};
for(const line of fs.readFileSync(path.join(app,'.env'),'utf8').split(/\r?\n/)) {
 const m=line.trim().match(/^([^#=]+)=(.*)$/); if(m && env[m[1].trim()]===undefined) env[m[1].trim()]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');
}
const result={date:'2026-10-19',syntax:[],database:{status:'not-run'}};
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory() ? ['node_modules','dist','.idea','.git'].includes(e.name)?[]:walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(app).filter(f=>/\.(js|jsx)$/.test(f))){
 try {parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']});result.syntax.push({file:path.relative(app,file).replaceAll('\\','/'),status:'pass'});}
 catch(e){result.syntax.push({file:path.relative(app,file),status:'fail',line:e.loc?.line});}
}
let conn;
try {
 conn=await mysql.createConnection({host:env.CAMPUS_DB_HOST||'127.0.0.1',port:Number(env.CAMPUS_DB_PORT||3306),user:env.CAMPUS_DB_USER||'root',password:env.CAMPUS_DB_PASSWORD||'root',database:env.CAMPUS_DB_NAME||'campus_access',connectTimeout:5000});
 await conn.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
 await conn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
 const [tables]=await conn.query("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
 const [columns]=await conn.query('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,COLUMN_KEY FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION');
 const backup={format:'P0 MySQL DDL and row snapshot; restore only into isolated database',tables:[]};
 const counts=[];
 for(const row of tables){const t=row.TABLE_NAME;const escaped='`'+t.replaceAll('`','``')+'`';const [ddl]=await conn.query('SHOW CREATE TABLE '+escaped);const [data]=await conn.query('SELECT * FROM '+escaped);backup.tables.push({table:t,ddl:ddl[0]['Create Table'],rows:data});counts.push({table:t,rows:data.length});}
 const backupDir=fs.mkdtempSync(path.join(os.tmpdir(),'campus-p0-private-'));
 const backupFile=path.join(backupDir,'database-snapshot.json');
 fs.writeFileSync(backupFile,JSON.stringify(backup),{mode:0o600});
 const [roles]=await conn.query('SELECT role,COUNT(*) AS count FROM users GROUP BY role');
 await conn.rollback();
 result.database={status:'pass-read-only',tables:counts,columns,roles,backup:{path:backupFile,sha256:crypto.createHash('sha256').update(fs.readFileSync(backupFile)).digest('hex'),restoreTest:'not-run',containsSensitiveData:true,tracked:false},foreignKeys:backup.tables.flatMap(t=>[...t.ddl.matchAll(/CONSTRAINT `([^`]+)` FOREIGN KEY/g)].map(m=>({table:t.table,name:m[1]})))};
}catch(e){result.database={status:'failed',code:e.code||e.name};process.exitCode=1;}
finally{if(conn) await conn.end();}
fs.writeFileSync(path.join(docs,'database-live-summary.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({syntaxFiles:result.syntax.length,syntaxFailures:result.syntax.filter(x=>x.status!=='pass'),databaseStatus:result.database.status,tables:result.database.tables,roles:result.database.roles,backupCreated:!!result.database.backup}));
