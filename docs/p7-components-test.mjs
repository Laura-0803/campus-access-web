// Real service-name Feign/Ribbon requests and a bounded, owned exception outage.
import fs from'node:fs';import{execFileSync}from'node:child_process';import{call,login,wait,config as c}from'./p7-http.mjs';
process.env.P6_ROUTE='true';const out='docs/p7-evidence/components-'+Date.now()+'.json',results=[],samples=[];let token,complete=false;const halted=new Set();
const save=()=>fs.writeFileSync(out,JSON.stringify({complete,pass:complete&&results.every(x=>x.pass),results,samples},null,2));
function check(name,pass,detail={}){results.push({name,pass:!!pass,...detail});save();if(!pass)throw Error(name);}
function cmd(action,n){execFileSync('python',['docs/p7-runtime.py',action,n],{windowsHide:true,stdio:'pipe'});if(action==='halt')halted.add(n);else halted.delete(n);}
async function components(){return(await call('GET','http://127.0.0.1:19861/internal/components',null,null,{'X-Campus-Internal':c.internalKey})).body;}
try{
 token=await login('admin');let before;check('both-user-and-exception-ribbon-lists',await wait(async()=>{before=await components();return [19811,19813].every(p=>before.loadBalancers['user-service'].servers.includes(String(p)))&&[19851,19853].every(p=>before.loadBalancers['exception-service'].servers.includes(String(p)));}));
 const calls=[];for(let i=0;i<20;i++){const r=await call('GET','/dashboard/admin',null,token);calls.push({sequence:i+1,status:r.status});check('gateway-feign-request-'+(i+1),r.status===200&&r.body.success===true);}
 const after=await components();samples.push({before,after,calls});check('real-ribbon-client',after.client.includes('RibbonLoadBalancerClient'));
 for(const [name,ports]of[['user-service',[19811,19813]],['exception-service',[19851,19853]]]){check('roundrobin-'+name,after.loadBalancers[name].rule==='com.netflix.loadbalancer.RoundRobinRule');for(const p of ports)check('actual-port-increment-'+p,Number(after.ribbonRequestsByPort[name][p])>Number(before.ribbonRequestsByPort[name][p]||0));}
 for(const name of ['exception1','exception2'])cmd('halt',name);
 let st,denials=[];check('real-open-errors-and-shortcircuits',await wait(async()=>{const r=await call('GET','/reports/summary',null,token);denials.push({status:r.status,success:r.body.success});st=await components();return st.circuits.some(x=>x.open&&x.errors>0&&x.shortCircuits>0);},30000));
 check('no-fake-success-statistics',denials.length>0&&denials.every(x=>x.status===503&&x.success===false));const begin=Date.now(),h=await call('GET','/health');check('core-unavailable-health503',h.status===503,{elapsedMs:Date.now()-begin});check('health-time-bounded',Date.now()-begin<4500);samples.push({outage:st,denials});
 for(const n of [...halted])cmd('restart',n);
 check('health-recovered',await wait(async()=>{const r=await call('GET','/health');return r.status===200;},120000));check('real-report-recovered',await wait(async()=>{const r=await call('GET','/reports/summary',null,token);return r.status===200&&r.body.data.access.total>0;},30000));samples.push({recovery:await components()});
 check('disabled-delete-stays404',(await call('DELETE','/people/SYN-P-visitor',null,token)).status===404);complete=true;save();console.log(JSON.stringify({evidence:out,assertions:results.length,pass:true}));
}catch(e){save();console.error(JSON.stringify({evidence:out,failure:e.message}));process.exitCode=1;}finally{for(const n of halted)try{cmd('restart',n);}catch{}if(token)await call('POST','/auth/logout',{},token).catch(()=>{});save();}
