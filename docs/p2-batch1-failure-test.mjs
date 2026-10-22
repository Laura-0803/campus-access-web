import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';
const root=process.cwd(),c=JSON.parse(fs.readFileSync('.p2-local/runtime.json','utf8')),req=createRequire(path.join(root,'campus-access-web/package.json')),db=await req('mysql2/promise').createConnection({host:c.host,port:c.port,user:c.username,password:c.password,database:c.database}),results=[],out='docs/p2-evidence/batch1-failure-'+Date.now()+'.json';
const save=(name,pass,details={})=>{results.push({name,pass,...details});fs.writeFileSync(out,JSON.stringify({results},null,2));if(!pass)throw Error(name);};
async function api(path,body,token){let r=await fetch('http://127.0.0.1:19800/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(6000)});return {status:r.status,body:await r.json()};}
function runtime(cmd,name){execFileSync('python',['docs/p2-runtime.py',cmd,name],{windowsHide:true,stdio:'pipe'});}
async function poll(fn,seconds=60){const end=Date.now()+seconds*1000;while(Date.now()<end){try{if(await fn())return true;}catch{}await new Promise(r=>setTimeout(r,500));}return false;}
let adapterStopped=false,userStopped=false;
async function components(){const r=await fetch('http://127.0.0.1:19811/internal/components',{headers:{'X-Campus-Internal':c.internalKey}});return r.json();}
try{
await db.query('DELETE FROM verification_codes WHERE phone=?',[c.allowedPhones[11]]);await db.query('DELETE FROM users WHERE username=?',[c.allowedPhones[11]]);await db.query('DELETE FROM people WHERE phone=?',[c.allowedPhones[11]]);
const issued=await api('/auth/send-code',{phone:c.allowedPhones[11]}),session=await api('/auth/login',{account:'SYN-STUDENT',password:c.demoPassword}),token=session.body.data.token;
save('components-before-outage',true,{components:await components()});
runtime('halt','adapter');adapterStopped=true;
const registerBody={name:'合成下游故障',phone:c.allowedPhones[11],idNumber:'990000200001010011',password:c.demoPassword,confirmPassword:c.demoPassword,code:issued.body.data.code};
for(let i=0;i<4;i++){const r=await api('/auth/register-visitor',registerBody);save('blacklist-outage-safe-reject-'+i,r.status===503,{status:r.status});}
let snapshot=await components();save('real-ribbon-client',snapshot.loadBalancerClient.includes('RibbonLoadBalancerClient'),{components:snapshot});
save('real-hystrix-open',await poll(async()=>{snapshot=await components();return snapshot.circuits.some(c=>c.open&&c.errors>0);},12),{components:snapshot});
await api('/auth/register-visitor',registerBody);save('hystrix-short-circuit',await poll(async()=>{snapshot=await components();return snapshot.circuits.some(c=>c.shortCircuits>0);},5),{components:snapshot});
const [rows]=await db.query('SELECT COUNT(*) AS n FROM people WHERE phone=?',[c.allowedPhones[11]]);save('blacklist-outage-no-person-write',rows[0].n===0);
runtime('restart','adapter');adapterStopped=false;save('adapter-restored',await poll(async()=> (await api('/appointments',null,token)).status===200));
save('real-hystrix-recovery',await poll(async()=>{await db.query("UPDATE verification_codes SET attempts=0 WHERE purpose='register' AND phone=?",[c.allowedPhones[11]]);return (await api('/auth/register-visitor',registerBody)).status===201;}));
snapshot=await components();save('hystrix-closed-after-success',snapshot.circuits.every(c=>!c.open),{components:snapshot});
runtime('halt','user');userStopped=true;const r=await api('/appointments',null,token);save('authority-outage-safe-reject',r.status===503,{status:r.status});
runtime('restart','user');userStopped=false;save('authority-restored',await poll(async()=> (await api('/appointments',null,token)).status===200));
save('restart-session-persistence',(await api('/auth/me',null,token)).body.data.user.role==='student');
console.log(JSON.stringify({evidence:out,assertions:results.length,pass:true}));
}catch(e){console.error(e.message);process.exitCode=1;}finally{if(adapterStopped)runtime('restart','adapter');if(userStopped)runtime('restart','user');await db.end();}
