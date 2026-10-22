// Read-only current P2 account grants and original DB denial; no original initialization.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const req=createRequire(path.join(process.cwd(),'campus-access-web/package.json')),c=JSON.parse(fs.readFileSync('.p2-local/runtime.json','utf8'));
if(!/^campus_p2_user_\d{14}$/.test(c.database)||!/^campus_p2_legacy_\d{14}$/.test(c.legacy))throw Error('Unsafe isolation target');
const results=[];
for(const[role,user,password,database,other]of [['java',c.username,c.password,c.database,c.legacy],['express',c.legacyUser,c.legacyPassword,c.legacy,c.database]]){
 const db=await req('mysql2/promise').createConnection({host:c.host,port:c.port,user,password,database});
 try{const grants=(await db.query('SHOW GRANTS'))[0].map(row=>String(Object.values(row)[0]));
 const ownSchemaOnly=grants.every(g=>g.startsWith('GRANT USAGE')||g.includes(' ON `'+database+'`.*'));
 const noDdl=grants.every(g=>!g.match(/\b(CREATE|ALTER|DROP|ALL PRIVILEGES|GRANT OPTION)\b/));
 const denied={};for(const target of ['campus_access',other]){try{await db.query('SELECT COUNT(*) FROM `'+target+'`.users');denied[target]=false;}catch(e){denied[target]=['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code);}}
 results.push({role,ownSchemaOnly,noDdl,deniedOriginalAndOtherDomain:Object.values(denied).every(Boolean),probedSchemas:Object.keys(denied),pass:ownSchemaOnly&&noDdl&&Object.values(denied).every(Boolean)});
 }finally{await db.end();}
}
fs.writeFileSync('docs/p2-evidence/closeout-isolation.json',JSON.stringify({results,originalDatabaseWritesByThisScript:0,pass:results.every(r=>r.pass)},null,2));
if(results.some(r=>!r.pass))throw Error('Isolation check failed');console.log('Both P2 accounts isolated; original/other domain reads denied; DDL not granted');
