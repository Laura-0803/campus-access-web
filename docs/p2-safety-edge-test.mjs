import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const c=JSON.parse(fs.readFileSync('.p2-local/runtime.json','utf8')),req=createRequire(path.join(process.cwd(),'campus-access-web/package.json')),db=await req('mysql2/promise').createConnection({host:c.host,port:c.port,user:c.username,password:c.password,database:c.database}),results=[],out='docs/p2-evidence/safety-edges-'+Date.now()+'.json';
function check(name,pass){results.push({name,pass});fs.writeFileSync(out,JSON.stringify({results,pass:results.every(r=>r.pass)},null,2));if(!pass)throw Error(name);}
async function api(method,p,token,body){const r=await fetch('http://127.0.0.1:19800/api'+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};}
try{
for(const role of ['student','teacher','visitor']){const session=await api('POST','/auth/login',null,{account:'SYN-'+role.toUpperCase(),password:c.demoPassword}),token=session.body.data.token;
await db.query('UPDATE users SET person_id=NULL WHERE id=?',['SYN-U-'+role]);
check('missing-person-legacy-denied-'+role,(await api('GET','/appointments',token)).status===403);
if(role==='student'||role==='teacher')check('missing-person-face-no-global-list-'+role,(await api('GET','/faces',token)).status===404);
if(role==='teacher')check('missing-person-vehicle-no-global-list',(await api('GET','/vehicles',token)).status===404);
await db.query('UPDATE users SET person_id=? WHERE id=?',['SYN-P-'+role,'SYN-U-'+role]);check('person-link-restored-'+role,(await api('GET','/appointments',token)).status===200);
}
const session=await api('POST','/auth/login',null,{account:'SYN-STUDENT',password:c.demoPassword}),token=session.body.data.token,hash=crypto.createHash('sha256').update(token).digest('hex'),[rows]=await db.query('SELECT created_at,expires_at FROM sessions WHERE token=?',[hash]);check('session-eight-hour-duration',Date.parse(rows[0].expires_at)-Date.parse(rows[0].created_at)===28800000);
await db.query('UPDATE sessions SET expires_at=? WHERE token=?',[new Date(Date.now()-1000).toISOString(),hash]);check('valid-iso-expired-token-java',(await api('GET','/auth/me',token)).status===401);check('valid-iso-expired-token-legacy',(await api('GET','/appointments',token)).status===401);
console.log(JSON.stringify({evidence:out,assertions:results.length,pass:true}));
}catch(e){console.error(e.message);process.exitCode=1;}finally{for(const role of ['student','teacher','visitor'])await db.query('UPDATE users SET person_id=? WHERE id=?',['SYN-P-'+role,'SYN-U-'+role]);await db.end();}
