import fs from'node:fs';import net from'node:net';import{call,login,wait,config as c}from'./p7-http.mjs';
const out='docs/p7-evidence/ready-'+Date.now()+'.json',checks={};let token;
try{
 checks.health=await wait(async()=>{const r=await call('GET','/health');return r.status===200&&r.body.data.store?.type==='distributed-mysql-relational';},90000);
 checks.expressStopped=await new Promise(resolve=>{const s=net.connect({host:'127.0.0.1',port:19830});s.once('connect',()=>{s.destroy();resolve(false)});s.once('error',()=>resolve(true));});
 token=await login('admin');for(const p of ['/dashboard/admin','/reports/summary','/reports/access']){const r=await call('GET',p,null,token);checks[p]=r.status===200;}
 for(const port of [19761,19762]){const r=await fetch('http://127.0.0.1:'+port+'/eureka/apps/AGGREGATION-SERVICE',{headers:{Accept:'application/json'}}),b=await r.json();checks['registry-'+port]=r.ok&&b.application.instance.some(i=>i.status==='UP'&&i.port.$===19861);}
 const cr=await call('GET','http://127.0.0.1:19861/internal/components',null,null,{'X-Campus-Internal':c.internalKey});checks.ribbon=cr.body.client?.includes('RibbonLoadBalancerClient');
 // Read-only readiness of the existing cross-domain Ribbon lists, not a fixed startup sleep.
 checks.appointmentDownstreams=await wait(async()=>{const r=await call('GET','http://127.0.0.1:19821/internal/components',null,null,{'X-Campus-Internal':c.internalKey});return r.status===200&&r.body.downstreams?.['access-service']?.includes('19841')&&r.body.servers?.includes('19811')&&r.body.servers?.includes('19813');},30000);
 checks.accessDownstreams=await wait(async()=>{const r=await call('GET','http://127.0.0.1:19841/internal/components',null,null,{'X-Campus-Internal':c.internalKey});return r.status===200&&r.body.downstreams?.['appointment-service']?.includes('19821')&&r.body.servers?.includes('19811')&&r.body.servers?.includes('19813');},30000);
}catch{checks.exception=false;}finally{if(token)await call('POST','/auth/logout',{},token).catch(()=>{});}
const report={checks,pass:Object.values(checks).every(Boolean)};fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({evidence:out,...report}));if(!report.pass)process.exitCode=1;
