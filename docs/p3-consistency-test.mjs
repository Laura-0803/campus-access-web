import fs from'node:fs';import path from'node:path';import{createRequire}from'node:module';import{execFileSync}from'node:child_process';
const c=JSON.parse(fs.readFileSync('.p3-local/runtime.json','utf8')),req=createRequire(path.join(process.cwd(),'campus-access-web/package.json')),mysql=req('mysql2/promise');if(!/^campus_p3_appointment_\d{14}$/.test(c.appointmentDatabase))throw Error('Unsafe schema');
const db=await mysql.createConnection({host:c.host,port:c.port,user:c.appointmentUser,password:c.appointmentPassword,database:c.appointmentDatabase}),out='docs/p3-evidence/consistency-'+Date.now()+'.json',results=[],tokens={};let locked=false,changed=false,stopped=false;
function save(complete=false){fs.writeFileSync(out,JSON.stringify({complete,pass:complete&&results.every(x=>x.pass),results},null,2));}function check(name,ok,detail={}){results.push({name,pass:!!ok,...detail});save();if(!ok)throw Error(name);}
async function call(role,method,p,body){const r=await fetch('http://127.0.0.1:19800/api'+p,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(tokens[role]||'')},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});return{status:r.status,body:await r.json()};}
async function wait(fn,ms=30000){const end=Date.now()+ms;while(Date.now()<end){try{if(await fn())return true;}catch{}await new Promise(r=>setTimeout(r,200));}return false;}
function command(...a){execFileSync('python',['docs/p3-runtime.py',...a],{windowsHide:true,stdio:'pipe'});}
try{
 for(const role of ['visitor','student','admin']){const r=await call(role,'POST','/auth/login',{account:'SYN-'+role.toUpperCase(),password:c.demoPassword});check('login-'+role,r.status===200);tokens[role]=r.body.data.token;}
 const created=await call('visitor','POST','/appointments',{host:' SYN-P-student ',reason:'合成等待锁期间撤权测试',visitStart:'2099-11-02 09:00'});check('trimmed-host-create',created.status===201);const id=created.body.data.id;
 await db.beginTransaction();await db.query('SELECT id FROM appointments WHERE id=? FOR UPDATE',[id]);locked=true;
 const pending=call('student','PATCH','/appointments/'+id+'/review',{status:'已通过'});
 // Observe a real InnoDB lock wait through a provisioning connection, never assume sleep proves it.
 const env={};for(const l of fs.readFileSync('campus-access-web/.env','utf8').split(/\r?\n/)){const m=l.match(/^([^#=]+)=(.*)$/);if(m)env[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');}
 const observer=await mysql.createConnection({host:c.host,port:c.port,user:env.CAMPUS_DB_USER,password:env.CAMPUS_DB_PASSWORD});
 try{check('review-observed-waiting-on-database-lock',await wait(async()=>{const [r]=await observer.query("SELECT COUNT(*) n FROM information_schema.INNODB_TRX WHERE trx_state='LOCK WAIT' AND trx_mysql_thread_id IN (SELECT ID FROM information_schema.PROCESSLIST WHERE DB=?)",[c.appointmentDatabase]);return Number(r[0].n)>0;},8000));}finally{await observer.end();}
 check('revoke-role-while-waiting',(await call('admin','PATCH','/users/SYN-U-student',{role:'guard'})).status===200);changed=true;await db.commit();locked=false;
 const rejected=await pending;check('revalidated-after-lock-denies-revoked-role',rejected.status===403,{status:rejected.status});check('revoked-review-no-transition',(await db.query('SELECT status,version FROM appointments WHERE id=?',[id]))[0][0].status==='待被访人审核');
 await call('admin','PATCH','/users/SYN-U-student',{role:'student'});changed=false;
 const [[event]]=await db.query('SELECT event_id FROM appointment_outbox WHERE appointment_id=?',[id]);check('audit-initially-delivered',await wait(async()=>((await db.query('SELECT state FROM appointment_outbox WHERE event_id=?',[event.event_id]))[0][0].state==='DELIVERED')));
 command('halt','user1');command('halt','user2');stopped=true;
 // Simulate lost delivery acknowledgement: stable persisted event already exists remotely.
 await db.query("UPDATE appointment_outbox SET state='PENDING',attempts=0,next_retry_at=NULL WHERE event_id=?",[event.event_id]);
 check('audit-failure-retained-for-retry',await wait(async()=>{const [[r]]=await db.query('SELECT state,attempts,last_error_code FROM appointment_outbox WHERE event_id=?',[event.event_id]);return r.state==='PENDING'&&r.attempts>0&&r.last_error_code==='REMOTE_UNAVAILABLE';}));
 command('restart','user1');command('restart','user2');stopped=false;check('audit-recovers-after-user-restart',await wait(async()=>((await db.query('SELECT state FROM appointment_outbox WHERE event_id=?',[event.event_id]))[0][0].state==='DELIVERED'),120000));
 const users=await mysql.createConnection({host:c.host,port:c.port,user:c.username,password:c.password,database:c.database});try{const [[r]]=await users.query('SELECT COUNT(*) n FROM logs WHERE id=?',[event.event_id]);check('lost-ack-retry-single-remote-audit',Number(r.n)===1);}finally{await users.end();}
 save(true);console.log('PASS '+results.length+' consistency checks: '+out);
}catch(e){console.error(e.code||e.message);fs.writeFileSync(out+'.failure.json',JSON.stringify({error:e.code||e.message}));process.exitCode=1;}finally{if(locked)await db.rollback();if(changed)await call('admin','PATCH','/users/SYN-U-student',{role:'student'});if(stopped){command('restart','user1');command('restart','user2');}await db.end();}
