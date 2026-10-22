// Stops the TWO owned user-service JVMs, observes real Hystrix, then restarts them.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import crypto from 'node:crypto';
const req=createRequire(path.join(process.cwd(),'campus-access-web/package.json')),c=JSON.parse(fs.readFileSync('.p3-local/runtime.json','utf8'));
if(!/^campus_p3_appointment_\d{14}$/.test(c.appointmentDatabase))throw Error('Unsafe schema');
const db=await req('mysql2/promise').createConnection({host:c.host,port:c.port,user:c.appointmentUser,password:c.appointmentPassword,database:c.appointmentDatabase});
const out='docs/p3-evidence/fault-'+Date.now()+'.json',results=[],observations=[];let stopped=false,token;
function save(complete=false){fs.writeFileSync(out,JSON.stringify({results,observations,complete,pass:complete&&results.every(r=>r.pass)},null,2));}
function check(name,ok,detail={}){results.push({name,pass:!!ok,...detail});save();if(!ok)throw Error(name);}
function command(...args){execFileSync('python',['docs/p3-runtime.py',...args],{windowsHide:true,stdio:'pipe'});}
async function call(method,url,body,t){const r=await fetch(url.startsWith('http')?url:'http://127.0.0.1:19800/api'+url,{method,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{}),...(url.startsWith('http://127.0.0.1:19821/internal')?{'X-Campus-Internal':c.internalKey}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(6000)});return{status:r.status,body:await r.json().catch(()=>({}))};}
async function diag(){return(await call('GET','http://127.0.0.1:19821/internal/components')).body;}
function summarize(d){return d.circuits.map(x=>({command:x.command,open:x.open,requests:x.requests,errors:x.errors,failures:x.failures,shortCircuits:x.shortCircuits,fallbackResponses:x.fallbackResponses,successes:x.successes}));}
async function hashRows(){return crypto.createHash('sha256').update(JSON.stringify((await db.query('SELECT * FROM appointments ORDER BY id'))[0])).digest('hex');}
try{
 const login=await call('POST','/auth/login',{account:'SYN-VISITOR',password:c.demoPassword});check('login-before-fault',login.status===200);token=login.body.data.token;
 check('normal-remote-validation',(await call('GET','/appointments',null,token)).status===200);const original=await hashRows();const baseline=await diag();observations.push({phase:'baseline',circuits:summarize(baseline)});
 command('halt','user1');command('halt','user2');stopped=true;
 let opened=false,deadline=Date.now()+35000;
 while(Date.now()<deadline){const r=await call('GET','/appointments',null,token),d=await diag();observations.push({phase:'both-users-stopped',status:r.status,circuits:summarize(d)});check('downstream-denied-'+observations.length,r.status===503&&r.body.success===false);if(d.circuits.some(x=>x.open&&x.errors>0)){opened=true;break;}await new Promise(r=>setTimeout(r,200));}
 check('hystrix-real-open',opened);
 let writeOpened=false;deadline=Date.now()+35000;
 while(Date.now()<deadline){const r=await call('POST','/appointments',{host:'SYN-P-student',reason:'合成下游停机拒绝测试',visitStart:'2099-10-20 10:00'},token),d=await diag();observations.push({phase:'write-authority-down',status:r.status,circuits:summarize(d)});check('create-fail-closed-'+observations.length,r.status===503&&r.body.success===false);if(d.circuits.some(x=>x.command.includes('resolve')&&x.open)){writeOpened=true;break;}await new Promise(r=>setTimeout(r,150));}
 check('write-validation-real-circuit-open',writeOpened);
 for(let i=0;i<3;i++){const r=await call('GET','/appointments',null,token);observations.push({phase:'open-short-circuit',status:r.status});}
 let short=false;deadline=Date.now()+5000;while(Date.now()<deadline){const d=await diag();observations.push({phase:'metrics-after-open',circuits:summarize(d)});if(d.circuits.some(x=>x.open&&x.failures>0&&x.shortCircuits>0&&x.fallbackResponses>0)){short=true;break;}await new Promise(r=>setTimeout(r,150));}
 check('failure-and-short-circuit-distinguished',short);
 const legacy=await call('GET','/dashboard/visitor',null,token);check('legacy-fail-closed-when-authority-down',legacy.status===503);
 check('no-appointment-state-changed-on-validation-failure',await hashRows()===original);
 command('restart','user1');command('restart','user2');stopped=false;
 let ready=false;deadline=Date.now()+100000;while(Date.now()<deadline){try{const a=await call('GET','http://127.0.0.1:19811/api/roles'),b=await call('GET','http://127.0.0.1:19813/api/roles');ready=a.status===200&&b.status===200;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,300));}
 check('both-user-jvms-restarted',ready);
 let restored=false;deadline=Date.now()+35000;while(Date.now()<deadline){const r=await call('GET','/appointments',null,token),probe=await call('POST','/appointments',{},token),d=await diag();observations.push({phase:'recovery-probe',status:r.status,writeProbeStatus:probe.status,circuits:summarize(d)});if(r.status===200&&probe.status===400&&d.circuits.every(x=>!x.open)){restored=true;break;}await new Promise(r=>setTimeout(r,250));}
 check('real-probe-restores-circuit',restored);
 for(let i=0;i<5;i++)check('post-recovery-normal-'+i,(await call('GET','/appointments',null,token)).status===200);
 check('legacy-session-survives-user-restart',(await call('GET','/dashboard/visitor',null,token)).status===200);
 const before=await hashRows();command('halt','appointment');command('restart','appointment');
 let persistent=false;deadline=Date.now()+75000;while(Date.now()<deadline){try{const r=await call('GET','/appointments',null,token);persistent=r.status===200&&r.body.data.some(a=>a.id==='SYN-APT');}catch{}if(persistent)break;await new Promise(r=>setTimeout(r,300));}
 check('appointment-jvm-restart-persistence',persistent&&await hashRows()===before);
 save(true);console.log(JSON.stringify({evidence:out,assertions:results.length,pass:true}));
}catch(e){save();console.error(JSON.stringify({evidence:out,failed:e.message}));process.exitCode=1;}
finally{if(stopped){try{command('restart','user1');command('restart','user2');}catch{}}await db.end();}
