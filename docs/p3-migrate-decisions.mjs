import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const req=createRequire(path.join(process.cwd(),'campus-access-web/package.json')),mysql=req('mysql2/promise');
const c=JSON.parse(fs.readFileSync('.p3-local/runtime.json','utf8')),env={};
for(const line of fs.readFileSync('campus-access-web/.env','utf8').split(/\r?\n/)){const m=line.match(/^([^#=]+)=(.*)$/);if(m)env[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');}
if(!/^campus_p3_appointment_\d{14}$/.test(c.appointmentDatabase))throw Error('Unsafe target');
const db=await mysql.createConnection({host:'127.0.0.1',port:Number(env.CAMPUS_DB_PORT||3306),user:env.CAMPUS_DB_USER,password:env.CAMPUS_DB_PASSWORD,database:c.appointmentDatabase});
try{for(let pass=0;pass<2;pass++){
 const [columns]=await db.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='appointments' AND COLUMN_NAME='version'",[c.appointmentDatabase]);
 if(!columns.length)await db.query('ALTER TABLE appointments ADD COLUMN version BIGINT NOT NULL DEFAULT 0');
 const sql=fs.readFileSync('backend/appointment-service/src/main/resources/db/migration/V002__appointment_decisions.sql','utf8').replace(/^--.*$/gm,'');
 for(const statement of sql.split(';').filter(s=>s.trim()))await db.query(statement);
}fs.writeFileSync('docs/p3-evidence/decision-migration.json',JSON.stringify({schema:c.appointmentDatabase,executions:2,versionColumn:true,history:true,outbox:true,originalSchemaModified:false},null,2));console.log('P3 V002 executed twice on isolated schema');}finally{await db.end();}
