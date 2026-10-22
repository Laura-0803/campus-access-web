import fs from'node:fs';import path from'node:path';import{createRequire}from'node:module';
const c=JSON.parse(fs.readFileSync('.p3-local/runtime.json','utf8')),env={};for(const l of fs.readFileSync('campus-access-web/.env','utf8').split(/\r?\n/)){const m=l.match(/^([^#=]+)=(.*)$/);if(m)env[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');}
if(!/^campus_p3_appointment_\d{14}$/.test(c.appointmentDatabase)||!/^p3l_\d{14}$/.test(c.legacyUser))throw Error('Unsafe test targets');
const req=createRequire(path.join(process.cwd(),'campus-access-web/package.json')),mysql=req('mysql2/promise'),db=await mysql.createConnection({host:c.host,port:c.port,user:env.CAMPUS_DB_USER,password:env.CAMPUS_DB_PASSWORD,database:c.appointmentDatabase});
const out='docs/p3-evidence/write-safety-'+Date.now()+'.json',results=[],tokens={};let trigger=false,revoked=false,disabled=false;
function save(complete=false){fs.writeFileSync(out,JSON.stringify({complete,pass:complete&&results.every(r=>r.pass),results},null,2));}function check(name,ok,detail={}){results.push({name,pass:!!ok,...detail});save();if(!ok)throw Error(name);}
async function call(role,method,path,body){const r=await fetch('http://127.0.0.1:19800/api'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(tokens[role]||'')},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});return{status:r.status,body:await r.json()};}
const body={host:'SYN-P-student',reason:'合成P3安全回滚测试',visitStart:'2099-11-01 10:00'};
async function counts(){return(await db.query('SELECT (SELECT COUNT(*) FROM appointments) AS appointments,(SELECT COUNT(*) FROM appointment_review_history) AS history,(SELECT COUNT(*) FROM appointment_outbox) AS outbox'))[0][0];}
try{
 for(const role of ['visitor','student','admin']){const r=await call(role,'POST','/auth/login',{account:'SYN-'+role.toUpperCase(),password:c.demoPassword});check('login-'+role,r.status===200);tokens[role]=r.body.data.token;}
 let r=await call('admin','PATCH','/people/SYN-P-student',{status:'停用'});disabled=true;check('disable-person-fixture',r.status===200);r=await call('visitor','POST','/appointments',body);check('disabled-host-approved-403',r.status===403&&r.body.error.message==='被访人当前状态不可预约');await call('admin','PATCH','/people/SYN-P-student',{status:'正常'});disabled=false;
 r=await call('admin','POST','/appointments',{...body,visitor:'合成黑名单访客',visitorPhone:'19900009997',idNumber:'990000200001019999'});check('blacklist-real-hit-rejects-creation',r.status===403);
 const fixture=await call('visitor','POST','/appointments',body);check('rollback-review-fixture',fixture.status===201);const id=fixture.body.data.id;
 const before=await counts();const [rowBefore]=await db.query('SELECT * FROM appointments WHERE id=?',[id]);
 await db.query("CREATE TRIGGER p3_test_history_failure BEFORE INSERT ON appointment_review_history FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='P3_SYNTHETIC_ROLLBACK'");trigger=true;
 r=await call('visitor','POST','/appointments',body);check('real-sql-failure-create-500',r.status===500&&r.body.error.message.indexOf('SQL')<0);
 check('insert-history-outbox-transaction-rolled-back',JSON.stringify(before)===JSON.stringify(await counts()));
 r=await call('student','PATCH','/appointments/'+id+'/review',{status:'已通过'});check('real-sql-failure-review-500',r.status===500);check('review-row-version-rolled-back',JSON.stringify(rowBefore)===JSON.stringify((await db.query('SELECT * FROM appointments WHERE id=?',[id]))[0]));
 await db.query('DROP TRIGGER p3_test_history_failure');trigger=false;
 await db.query('REVOKE SELECT ON `'+c.legacy+"`.`blacklist` FROM ?@'127.0.0.1'",[c.legacyUser]);revoked=true;
 const beforeFailure=await counts();r=await call('visitor','POST','/appointments',body);check('blacklist-unavailable-create-fail-closed',r.status===503,{status:r.status});r=await call('student','PATCH','/appointments/'+id+'/review',{status:'已通过'});check('blacklist-unavailable-review-fail-closed',r.status===503);
 check('blacklist-failure-no-local-writes',JSON.stringify(beforeFailure)===JSON.stringify(await counts()));
 await db.query('GRANT SELECT ON `'+c.legacy+"`.`blacklist` TO ?@'127.0.0.1'",[c.legacyUser]);revoked=false;
 r=await call('student','PATCH','/appointments/'+id+'/review',{status:'未通过'});check('rejection-independent-of-blacklist',r.status===200&&r.body.data.appointment.status==='未通过');
 save(true);console.log('PASS '+results.length+' safety checks: '+out);
}catch(e){console.error(e.code||e.message);fs.writeFileSync(out+'.failure.json',JSON.stringify({error:e.code||e.message}));process.exitCode=1;}
finally{if(trigger)await db.query('DROP TRIGGER p3_test_history_failure');if(revoked)await db.query('GRANT SELECT ON `'+c.legacy+"`.`blacklist` TO ?@'127.0.0.1'",[c.legacyUser]);if(disabled)await call('admin','PATCH','/people/SYN-P-student',{status:'正常'});await db.end();}
