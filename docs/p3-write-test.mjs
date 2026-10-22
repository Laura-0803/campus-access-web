import fs from 'node:fs';import path from 'node:path';import {createRequire}from'node:module';
const c=JSON.parse(fs.readFileSync('.p3-local/runtime.json','utf8')),req=createRequire(path.join(process.cwd(),'campus-access-web/package.json')),mysql=req('mysql2/promise');
if(!/^campus_p3_appointment_\d{14}$/.test(c.appointmentDatabase))throw Error('Unsafe schema');
const db=await mysql.createConnection({host:c.host,port:c.port,user:c.appointmentUser,password:c.appointmentPassword,database:c.appointmentDatabase}),out='docs/p3-evidence/writes-'+Date.now()+'.json',results=[],tokens={};
function save(complete=false){fs.writeFileSync(out,JSON.stringify({complete,pass:complete&&results.every(r=>r.pass),results},null,2));}
function check(name,ok,detail={}){results.push({name,pass:!!ok,...detail});save();if(!ok)throw Error(name);}
async function call(role,method,p,body){const r=await fetch('http://127.0.0.1:19800/api'+p,{method,headers:{'Content-Type':'application/json',...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});return{status:r.status,body:await r.json()};}
const body={host:'SYN-P-student',reason:'合成P3事务与并发测试',visitStart:'2099-10-20 09:00',visitEnd:'2099-10-20 12:00'};
async function create(extra={}){const r=await call('visitor','POST','/appointments',{...body,...extra});check('create-fixture',r.status===201,{status:r.status,error:r.body.error?.message});return r.body.data;}
async function review(role,id,status='已通过'){return call(role,'PATCH','/appointments/'+id+'/review',{status,comment:'合成审核'});}
try{
 for(const role of ['student','teacher','visitor','alumni','guard','admin']){const r=await call(role,'POST','/auth/login',{account:'SYN-'+role.toUpperCase(),password:c.demoPassword});check('login-'+role,r.status===200);tokens[role]=r.body.data.token;}
 for(const role of ['student','teacher','alumni','guard'])check('create-denied-'+role,(await call(role,'POST','/appointments',body)).status===403);
 check('missing-fields',(await call('visitor','POST','/appointments',{})).status===400);
 check('no-token-create',(await call('anonymous','POST','/appointments',body)).status===401);
 check('missing-host',(await call('visitor','POST','/appointments',{...body,host:'no-such-host'})).status===404);
 check('invalid-time',(await call('visitor','POST','/appointments',{...body,visitStart:'invalid'})).status===400);
 check('end-before-start',(await call('visitor','POST','/appointments',{...body,visitEnd:'2099-10-19 00:00'})).status===400);
 const a=await create({visitorId:'forged',visitor:'forged',userId:'forged'});check('identity-from-authority',a.visitorId==='SYN-P-visitor'&&a.status==='待被访人审核');check('create-contract',Object.keys(a).length===13&&!('reviewer'in a));
 for(const role of ['visitor','guard','alumni'])check('review-denied-'+role,(await review(role,a.id)).status===403);
 check('wrong-host-denied',(await review('teacher',a.id)).status===403);
 check('admin-cannot-bypass-host',(await review('admin',a.id)).status===400);
 const first=await review('student',a.id);check('host-approve',first.status===200&&first.body.data.appointment.status==='待保卫处审核'&&first.body.data.qrCode===null);
 check('repeat-host-review',(await review('student',a.id)).status===400);
 const [before]=await db.query('SELECT * FROM appointments WHERE id=?',[a.id]);
 const final=await review('admin',a.id);check('final-approval-explicitly-unavailable',final.status===503&&final.body.success===false,{status:final.status,message:final.body.error?.message});
 check('final-approval-no-state-change',JSON.stringify(before)===JSON.stringify((await db.query('SELECT * FROM appointments WHERE id=?',[a.id]))[0]));
 const rejected=await review('admin',a.id,'未通过');check('security-reject',rejected.status===200&&rejected.body.data.appointment.status==='未通过');check('rejected-cannot-reopen',(await review('admin',a.id)).status===400);
 const b=await create();const race=await Promise.all(Array.from({length:8},()=>review('student',b.id)));check('concurrent-review-one-winner',race.filter(r=>r.status===200).length===1&&race.filter(r=>r.status===400).length===7,{statuses:race.map(r=>r.status)});
 const [history]=await db.query('SELECT * FROM appointment_review_history WHERE appointment_id=?',[b.id]);check('concurrent-history-once',history.length===2&&history.some(h=>Number(h.decision_version)===1));
 const rejectHost=await create();check('host-reject',(await review('student',rejectHost.id,'未通过')).body.data.appointment.status==='未通过');
 const teacher=await create({host:'SYN-P-teacher'});check('teacher-own-approve',(await review('teacher',teacher.id)).body.data.appointment.status==='待保卫处审核');
 const legacy=await create();await db.query('UPDATE appointments SET status=? WHERE id=?',['待审核',legacy.id]);check('legacy-host-pending-approve',(await review('student',legacy.id)).body.data.appointment.status==='待保卫处审核');
 const black=await create();await db.query('UPDATE appointments SET id_number=? WHERE id=?',['990000200001019999',black.id]);check('new-blacklist-hit-review-denied',(await review('student',black.id)).status===403);check('blacklisted-rejection-still-allowed',(await review('student',black.id,'未通过')).status===200);
 const admin=await call('admin','POST','/appointments',{...body,host:'SYN-P-admin',visitor:'合成临时访客',visitorPhone:'19900009997',idNumber:''});check('admin-host-starts-security',admin.status===201&&admin.body.data.status==='待保卫处审核');
 const [events]=await db.query('SELECT event_id FROM appointment_outbox WHERE appointment_id=?',[b.id]);check('audit-outbox-persisted',events.length===2);
 let delivered=false;const deadline=Date.now()+25000;while(Date.now()<deadline){const [rows]=await db.query('SELECT state FROM appointment_outbox WHERE appointment_id=?',[b.id]);if(rows.every(r=>r.state==='DELIVERED')){delivered=true;break;}await new Promise(r=>setTimeout(r,250));}check('audit-real-http-delivery',delivered);
 save(true);console.log('PASS '+results.length+' write checks: '+out);
}catch(e){fs.writeFileSync(out+'.failure.json',JSON.stringify({error:e.message}));console.error(e.message);process.exitCode=1;}finally{await db.end();}
