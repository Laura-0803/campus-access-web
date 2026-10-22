// Provision only a new guarded P3 synthetic schema. Never import original store/init.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const req=createRequire(path.join(process.cwd(),'campus-access-web/package.json')),mysql=req('mysql2/promise');
fs.mkdirSync('.p3-local',{recursive:true});fs.mkdirSync('docs/p3-evidence',{recursive:true});
if(fs.existsSync('.p3-local/runtime.json'))throw Error('Refusing to overwrite P3 private config');
const p2=JSON.parse(fs.readFileSync('.p2-local/runtime.json','utf8')),env={};
for(const line of fs.readFileSync('campus-access-web/.env','utf8').split(/\r?\n/)){const m=line.match(/^([^#=]+)=(.*)$/);if(m)env[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');}
if(!env.CAMPUS_DB_USER||!env.CAMPUS_DB_PASSWORD)throw Error('Explicit provisioning credentials required');
const stamp=new Date().toISOString().replace(/\D/g,'').slice(0,14),database='campus_p3_appointment_'+stamp,username='p3a_'+stamp,password=crypto.randomBytes(24).toString('hex'),legacyUser='p3l_'+stamp,legacyPassword=crypto.randomBytes(24).toString('hex');
if(!/^campus_p3_appointment_\d{14}$/.test(database))throw Error('Unsafe target');
const root=await mysql.createConnection({host:env.CAMPUS_DB_HOST||'127.0.0.1',port:Number(env.CAMPUS_DB_PORT||3306),user:env.CAMPUS_DB_USER,password:env.CAMPUS_DB_PASSWORD});
try{
 await root.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 const sql=fs.readFileSync('backend/appointment-service/src/main/resources/db/migration/V001__appointment_schema.sql','utf8').replace(/^--.*$/gm,'').trim();
 await root.changeUser({database});for(let i=0;i<2;i++)await root.query(sql);
 await root.query("CREATE USER ?@'127.0.0.1' IDENTIFIED BY ?",[username,password]);await root.query("GRANT SELECT, INSERT, UPDATE, DELETE ON `"+database+"`.* TO ?@'127.0.0.1'",[username]);
 if(!/^campus_p2_legacy_\d{14}$/.test(p2.legacy))throw Error('Unsafe bridge schema');
 await root.query("CREATE USER ?@'127.0.0.1' IDENTIFIED BY ?",[legacyUser,legacyPassword]);
 for(const table of ['access_records','exceptions','devices','qr_codes','settings','gates','access_rules','blacklist','user_domain_outbox'])await root.query('GRANT SELECT, INSERT, UPDATE, DELETE ON `'+p2.legacy+'`.`'+table+"` TO ?@'127.0.0.1'",[legacyUser]);
 const base={visitor:'合成访客',visitor_id:'SYN-P-visitor',visitor_phone:p2.allowedPhones[2],id_number:'990000200001010002',host:'合成学生',host_id:'SYN-P-student',time:'2099-10-20 09:00',visit_start:'2099-10-20 09:00',visit_end:'2099-10-20 12:00',reason:'合成P3只读迁移验证',status:'待被访人审核',created_at:'2026-10-19 10:00:00',reviewed_at:null,reviewer:null,review_comment:null};
 const fixtures=[{id:'SYN-APT'},{id:'SYN-P3-TEACHER',host:'合成教职工',host_id:'SYN-P-teacher',status:'待审核'},{id:'SYN-P3-SECURITY',host:'合成管理员',host_id:'SYN-P-admin',status:'待保卫处审核'},{id:'SYN-P3-APPROVED',status:'已通过',reviewer:'合成管理员',reviewed_at:'2026-10-19 11:00:00'},{id:'SYN-P3-REJECTED',status:'未通过',reviewer:'合成学生',review_comment:'合成拒绝'},{id:'SYN-P3-LEGACY',visitor_id:null,host_id:null},{id:'SYN-P3-OTHER',visitor:'合成其他访客',visitor_id:'SYN-P-OTHER',visitor_phone:'19900009998',host_id:'SYN-P-teacher',host:'合成教职工'}];
 for(const[i,patch]of fixtures.entries()){const row={...base,...patch,sort_order:i};await root.query('INSERT INTO appointments SET ?',[row]);}
 fs.writeFileSync('.p3-local/runtime.json',JSON.stringify({...p2,legacyUser,legacyPassword,appointmentDatabase:database,appointmentUser:username,appointmentPassword:password},null,2));
 fs.writeFileSync('docs/p3-evidence/database-setup.json',JSON.stringify({schema:database,syntheticAppointments:fixtures.length,originalBusinessRowsCopied:0,migrationExecutions:2,p2SchemasReusedForSyntheticIdentityOnly:true,qrIssued:false},null,2));
 console.log('Created isolated P3 appointment schema, DML-only account and seven synthetic rows');
}catch(e){console.error(e.code||e.message);process.exitCode=1;}finally{await root.end();}
