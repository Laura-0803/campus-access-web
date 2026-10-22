// Actual original GET handlers + actual SQL/Java authority vs Java appointment APIs.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const root=process.cwd(),c=JSON.parse(fs.readFileSync('.p3-local/runtime.json','utf8')),req=createRequire(path.join(root,'campus-access-web/package.json')),mysql=req('mysql2/promise'),express=req('express');
if(!/^campus_p3_appointment_\d{14}$/.test(c.appointmentDatabase))throw Error('Unsafe test schema');
const db=await mysql.createConnection({host:c.host,port:c.port,user:c.appointmentUser,password:c.appointmentPassword,database:c.appointmentDatabase});
const out='docs/p3-evidence/queries-'+Date.now()+'.json',results=[],samples=[],roles=['student','teacher','visitor','alumni','guard','admin'];let golden;
function check(name,ok,detail={}){results.push({name,pass:!!ok,...detail});fs.writeFileSync(out,JSON.stringify({results,samples,pass:results.every(r=>r.pass)},null,2));if(!ok)throw Error(name);}
async function request(method,url,body,token,extra={}){const r=await fetch(url.startsWith('http')?url:'http://127.0.0.1:19800/api'+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...extra},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(7000)});return{status:r.status,body:await r.json().catch(()=>({})),service:r.headers.get('X-P3-Service')};}
async function diagnostics(){return(await request('GET','http://127.0.0.1:19821/internal/components',null,null,{'X-Campus-Internal':c.internalKey})).body;}
const tokens={};
try{
 const {scope}=await import('../backend/legacy-adapter/store.mjs');
 const route=(await import(pathToFileURL(path.join(root,'.p3-local/legacy-copy/routes/appointments.js')).href)).default;
 const {authorize}=await import(pathToFileURL(path.join(root,'.p3-local/legacy-copy/middleware/auth.js')).href);
 const app=express();app.use(async(r,s,next)=>{try{
  const headers={'X-Campus-Internal':c.internalKey,Authorization:r.get('Authorization')||''};
  const identityResponse=await fetch('http://127.0.0.1:19811/internal/session',{headers});const identity=await identityResponse.json();if(!identityResponse.ok)return s.status(identityResponse.status).json(identity);
  const projection=await(await fetch('http://127.0.0.1:19811/internal/projection',{headers:{'X-Campus-Internal':c.internalKey}})).json();
  const [rows]=await db.query('SELECT id,visitor,visitor_id AS visitorId,visitor_phone AS visitorPhone,id_number AS idNumber,host,host_id AS hostId,time,visit_start AS visitStart,visit_end AS visitEnd,reason,status,created_at AS createdAt,reviewed_at AS reviewedAt,reviewer,review_comment AS reviewComment FROM appointments ORDER BY sort_order,id');
  r.auth=identity;scope.run({data:{...projection,appointments:rows},persist(){throw Error('Golden server is GET-only');}},()=>next());
 }catch{next(Error('Golden authority/read failure'));}});app.use(authorize);app.use(route);app.use((e,r,s,n)=>s.status(500).json({success:false,error:{message:'Golden read failed'}}));
 golden=app.listen(0,'127.0.0.1');await new Promise(resolve=>golden.once('listening',resolve));const goldenPort=golden.address().port;
 const paths=['/appointments','/appointments/hosts','/appointments/SYN-APT','/appointments/SYN-P3-LEGACY','/appointments/not-found','/appointments?status='+encodeURIComponent('待审核'),'/appointments?host='+encodeURIComponent('学生'),'/appointments?visitorId=SYN-P-visitor&visitorPhone=invalid','/appointments?hostId=SYN-P-teacher','/appointments?visitorId=absent','/appointments?visitor='+encodeURIComponent('其他'),'/appointments?host=%25','/appointments?visitor='+encodeURIComponent("' OR 1=1 --"),'/appointments?visitorPhone='+c.allowedPhones[2],'/appointments?visitorId=SYN-P-visitor&status='+encodeURIComponent('已通过'),'/appointments?visitorId=absent&scopePhone='+c.allowedPhones[2]+'&scopeName='+encodeURIComponent('合成访客')];
 for(const role of roles){const login=await request('POST','/auth/login',{account:'SYN-'+role.toUpperCase(),password:c.demoPassword});check('login-'+role,login.status===200&&login.body.data.user.role===role);tokens[role]=login.body.data.token;
  for(const p of paths){const actual=await request('GET',p,null,tokens[role]),expected=await request('GET','http://127.0.0.1:'+goldenPort+p,null,tokens[role]);let equal=true;try{assert.deepStrictEqual(actual.body,expected.body);}catch{equal=false;}check('original-get-contract-'+role+'-'+p.split('?')[0],actual.status===expected.status&&equal,{status:actual.status,query:p.includes('?')?p.slice(p.indexOf('?')+1):'',originalStatus:expected.status,javaServiceHeader:actual.service});}
 }
 const admin=tokens.admin,student=tokens.student;
 check('invalid-token',(await request('GET','/appointments',null,'invalid-token')).status===401);
 check('internal-appointment-no-key',(await request('GET','http://127.0.0.1:19821/internal/appointments')).status===403);
 check('internal-user-no-key',(await request('GET','http://127.0.0.1:19811/internal/appointment-context',null,student)).status===403);
 check('gateway-internal-hidden',(await request('GET','http://127.0.0.1:19800/internal/appointment-context',null,student,{'X-Campus-Internal':c.internalKey})).status===404);
 check('forged-role-still-denied',(await request('GET','/appointments',null,tokens.guard,{'X-Role':'admin','X-User':'SYN-U-admin'})).status===403);
 await request('PATCH','/users/SYN-U-student',{role:'guard'},admin);check('role-change-live',(await request('GET','/appointments',null,student)).status===403);await request('PATCH','/users/SYN-U-student',{role:'student'},admin);
 await request('PATCH','/users/SYN-U-teacher',{status:'停用'},admin);check('status-change-live',(await request('GET','/appointments',null,tokens.teacher)).status===403);await request('PATCH','/users/SYN-U-teacher',{status:'启用'},admin);
 let diag=await diagnostics();check('real-ribbon-implementation',diag.loadBalancerClient.includes('RibbonLoadBalancerClient')&&diag.rule==='com.netflix.loadbalancer.RoundRobinRule'&&[19811,19813].every(p=>diag.servers.includes(String(p))),{loadBalancerClient:diag.loadBalancerClient,loadBalancer:diag.loadBalancer,rule:diag.rule,servers:diag.servers});
 const registry=await(await fetch('http://127.0.0.1:19761/eureka/apps/USER-SERVICE',{headers:{Accept:'application/json'}})).json(),ids=Object.fromEntries(registry.application.instance.map(i=>[i.port.$,i.instanceId]));
 for(let i=0;i<20;i++){const before=(await diagnostics()).handledBy,r=await request('GET','/appointments',null,student),after=(await diagnostics()).handledBy,diff=Object.entries(after).filter(([p,n])=>n-(before[p]||0)===1);samples.push({request:i+1,status:r.status,providerPort:diff.length===1?Number(diff[0][0]):null,instanceId:diff.length===1?ids[diff[0][0]]:null});check('ribbon-sample-'+(i+1),r.status===200&&r.service==='appointment-service'&&diff.length===1);}
 check('both-user-instances-served',[19811,19813].every(p=>samples.some(s=>s.providerPort===p)),{counts:Object.fromEntries([19811,19813].map(p=>[p,samples.filter(s=>s.providerPort===p).length]))});
 for(const port of [19761,19762]){const r=await fetch('http://127.0.0.1:'+port+'/eureka/apps/APPOINTMENT-SERVICE',{headers:{Accept:'application/json'}}),b=await r.json();check('appointment-registered-'+port,r.ok&&b.application.instance.some(i=>i.status==='UP'&&i.port.$===19821));}
 const blocked=await request('POST','http://127.0.0.1:19830/internal/blacklist-check',{credential:'990000200001019999'},null,{'X-Campus-Internal':c.internalKey});check('real-protected-blacklist-hit',blocked.status===200&&blocked.body.available===true&&blocked.body.blocked===true);
 check('blacklist-no-key',(await request('POST','http://127.0.0.1:19830/internal/blacklist-check',{credential:'990000200001019999'})).status===403);
 check('appointment-reads-only-own-schema',(await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema=?",[c.appointmentDatabase]))[0].map(t=>t.TABLE_NAME||t.table_name).sort().join(',')==='appointment_outbox,appointment_review_history,appointments');
 for(const database of ['campus_access',c.database,c.legacy]){let denied=false;try{await db.query('SELECT COUNT(*) FROM `'+database+'`.`'+(database===c.legacy?'qr_codes':'users')+'`');}catch(e){denied=['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code);}check('appointment-account-cannot-read-'+database,denied);}
 const bridge=await mysql.createConnection({host:c.host,port:c.port,user:c.legacyUser,password:c.legacyPassword,database:c.legacy});try{
  for(const database of [c.legacy,c.appointmentDatabase,c.database]){let denied=false;try{await bridge.query('SELECT COUNT(*) FROM `'+database+'`.`'+(database===c.database?'users':'appointments')+'`');}catch(e){denied=['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code);}check('p3-bridge-cannot-read-appointments-or-users-'+database,denied);}
 }finally{await bridge.end();}
 const count=Number((await db.query('SELECT COUNT(*) AS n FROM appointments'))[0][0].n);
 check('create-required-fields-validated',(await request('POST','/appointments',{host:'SYN-STUDENT'},tokens.visitor)).status===400);
 const pausedReview=await request('PATCH','/appointments/SYN-APT/review',{status:'已通过'},admin);check('review-order-enforced',pausedReview.status===400,{status:pausedReview.status});
 check('no-old-express-fallback-or-insert',Number((await db.query('SELECT COUNT(*) AS n FROM appointments'))[0][0].n)===count);
 check('p2-person-delete-still-disabled',(await request('DELETE','/people/SYN-P-student',null,admin)).status===404);
 for(const p of ['/dashboard/admin','/reports/summary','/reports/access']){const r=await request('GET',p,null,admin);check('legacy-aggregate-'+p,r.status===200&&r.body.success===true);}
 const legacyDashboard=await request('GET','/dashboard/visitor',null,tokens.visitor);check('legacy-uses-current-appointment-projection',legacyDashboard.body.data.appointments.some(a=>a.id==='SYN-P3-TEACHER'));
 await request('POST','/auth/logout',{},student);check('logout-java',(await request('GET','/appointments',null,student)).status===401);check('logout-legacy',(await request('GET','/dashboard/student',null,student)).status===401);
 console.log(JSON.stringify({evidence:out,assertions:results.length,originalGetComparisons:roles.length*paths.length,pass:true}));
}catch(e){fs.writeFileSync(out+'.failure.json',JSON.stringify({suitePass:false,completed:false,errorType:e.name,reason:e.name==='SyntaxError'?'Non-JSON denial response':e.message},null,2));console.error(JSON.stringify({evidence:out,failed:e.message}));process.exitCode=1;}finally{if(tokens.admin){await request('PATCH','/users/SYN-U-student',{role:'student'},tokens.admin).catch(()=>{});await request('PATCH','/users/SYN-U-teacher',{status:'启用'},tokens.admin).catch(()=>{});}if(golden)await new Promise(resolve=>golden.close(resolve));await db.end();}
