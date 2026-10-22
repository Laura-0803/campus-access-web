// Creates only fresh synthetic schemas. Does not import/initialize the legacy store.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const root=process.cwd(), req=createRequire(path.join(root,'campus-access-web/package.json')),mysql=req('mysql2/promise');
const local=path.join(root,'.p2-local');fs.mkdirSync(local,{recursive:true});
if(fs.existsSync(path.join(local,'runtime.json')))throw Error('Refusing to replace existing P2 credentials');
const env={};for(const line of fs.readFileSync('campus-access-web/.env','utf8').split(/\r?\n/)){const m=line.match(/^([^#=]+)=(.*)$/);if(m)env[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const stamp=new Date().toISOString().replace(/\D/g,'').slice(0,14),database='campus_p2_user_'+stamp,legacy='campus_p2_legacy_'+stamp;
const password=()=>crypto.randomBytes(24).toString('hex'),config={host:'127.0.0.1',port:Number(env.CAMPUS_DB_PORT||3306),database,legacy,username:'p2u_'+stamp,password:password(),legacyUser:'p2l_'+stamp,legacyPassword:password(),internalKey:password(),adapterKey:password(),demoPassword:password(),allowedPhones:Array.from({length:12},(_,i)=>'1990000'+String(i).padStart(4,'0'))};
const c=await mysql.createConnection({host:env.CAMPUS_DB_HOST||'127.0.0.1',port:config.port,user:env.CAMPUS_DB_USER,password:env.CAMPUS_DB_PASSWORD});
try{
for(const db of [database,legacy]){if(!/^campus_p2_(user|legacy)_\d{14}$/.test(db))throw Error('Unsafe target');await c.query('CREATE DATABASE `'+db+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');}
const schema=fs.readFileSync('campus-access-web/server/db/schema.sql','utf8'),tables=[...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\([\s\S]*?ENGINE=InnoDB[^;]+;/g)];
const owned=new Set(['roles','role_profiles','users','people','sessions','faces','vehicles','messages','logs']);
for(const m of tables)await c.query(m[0].replace('CREATE TABLE IF NOT EXISTS '+m[1],'CREATE TABLE `'+(owned.has(m[1])?database:legacy)+'`.`'+m[1]+'`'));
await c.query(`CREATE TABLE \`${database}\`.verification_codes (purpose VARCHAR(16) NOT NULL,phone VARCHAR(32) NOT NULL,user_id VARCHAR(64),digest CHAR(64) NOT NULL,sent_at BIGINT NOT NULL,expires_at BIGINT NOT NULL,attempts INT NOT NULL DEFAULT 0,PRIMARY KEY(purpose,phone)) ENGINE=InnoDB`);
await c.query(`ALTER TABLE \`${database}\`.sessions ADD INDEX ix_session_user(user_id)`);
await c.query(`ALTER TABLE \`${database}\`.people ADD UNIQUE KEY ux_person_code(code)`);
for(const [u,p,db] of [[config.username,config.password,database],[config.legacyUser,config.legacyPassword,legacy]]){await c.query('CREATE USER ?@\'127.0.0.1\' IDENTIFIED BY ?',[u,p]);await c.query('GRANT SELECT, INSERT, UPDATE, DELETE ON `'+db+'`.* TO ?@\'127.0.0.1\'',[u]);}
const roles=['student','teacher','visitor','alumni','guard','admin'],labels=['学生','教职工','访客','校友','门岗安保','管理员'];
for(let i=0;i<6;i++){const role=roles[i],id='SYN-P-'+role,salt=crypto.randomBytes(16).toString('hex'),hash='pbkdf2$120000$'+salt+'$'+crypto.pbkdf2Sync(config.demoPassword,salt,120000,32,'sha256').toString('hex');
await c.query(`INSERT INTO \`${database}\`.roles VALUES (?,?)`,[role,labels[i]]);
await c.query(`INSERT INTO \`${database}\`.role_profiles VALUES (?,?,?,?,?,?,?,?)`,[role,id,'合成'+labels[i],'合成课程测试',role,labels[i],'','正常']);
await c.query(`INSERT INTO \`${database}\`.people (id,name,type,code,id_number,role,college,class_name,phone,face_status,status,department,position,host,company,graduation_year,major,gate,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[id,'合成'+labels[i],labels[i],'SYN-'+role.toUpperCase(),'99000020000101000'+i,role,'合成学院','合成班级',config.allowedPhones[i],'未上传','正常','合成部门','合成岗位','合成学生','合成单位','2020','合成专业','东门',i]);
await c.query(`INSERT INTO \`${database}\`.users VALUES (?,?,?,?,?,?,?,?)`,['SYN-U-'+role,'SYN-'+role.toUpperCase(),'账号',hash,role,id,'启用',i]);}
await c.query(`INSERT INTO \`${legacy}\`.blacklist (id,credential_no,status) VALUES ('SYN-BLOCK','990000200001019999','生效')`);
await c.query(`INSERT INTO \`${legacy}\`.appointments (id,visitor,visitor_id,visitor_phone,host,host_id,status,sort_order) VALUES ('SYN-APT','合成访客','SYN-P-visitor',?,'合成学生','SYN-P-student','待被访人审核',0)`,[config.allowedPhones[2]]);
fs.writeFileSync(path.join(local,'runtime.json'),JSON.stringify(config,null,2));
fs.mkdirSync('docs/p2-evidence',{recursive:true});fs.writeFileSync('docs/p2-evidence/database-setup.json',JSON.stringify({database,legacy,syntheticUsers:6,source:'generated synthetic data only',originalDatabaseWrites:0},null,2));
console.log('Created two isolated synthetic schemas and restricted accounts; secrets saved privately');
}finally{await c.end();}
