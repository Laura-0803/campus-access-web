import fs from'node:fs';import crypto from'node:crypto';import{config as c,call,login,roles,wait,connect,incidentDb,mysql}from'./p5-http.mjs';
const out='docs/p6-evidence/comparison-'+Date.now()+'.json',results=[],tokens={},differences=[];let complete=false;
const save=()=>fs.writeFileSync(out,JSON.stringify({complete,pass:complete&&results.every(x=>x.pass),results,differences},null,2));
function check(name,pass,detail={}){results.push({name,pass:!!pass,...detail});save();if(!pass)throw Error(name);}
function canonical(v){return JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);}
const hash=v=>crypto.createHash('sha256').update(canonical(v)).digest('hex');
function diff(a,b,p='$'){if(canonical(a)===canonical(b))return[];if(a&&b&&typeof a==='object'&&typeof b==='object'){const keys=new Set([...Object.keys(a),...Object.keys(b)]);return [...keys].flatMap(k=>diff(a[k],b[k],p+'.'+k)).slice(0,40);}return[p];}
async function compare(path,token){const old=await call('GET','http://127.0.0.1:19830/api'+path,null,token,{'X-Adapter-Key':c.adapterKey}),java=await call('GET','http://127.0.0.1:19861/api'+path,null,token);const equal=old.status===java.status&&canonical(old.body)===canonical(java.body);if(!equal)differences.push({path,oldStatus:old.status,javaStatus:java.status,fieldPaths:diff(old.body,java.body),oldHash:hash(old.body),javaHash:hash(java.body)});check('contract '+path,equal,{status:java.status,responseHash:hash(java.body)});return java;}
try{
 check('aggregation-ready',await wait(async()=>{const r=await call('GET','http://127.0.0.1:19861/api/health');return r.status===200;},90000));
 for(const role of roles)tokens[role]=await login(role);
 for(const role of roles){await compare('/dashboard/'+role,tokens[role]);if(role!=='admin'){await compare('/dashboard/'+role+'?userId=SYN-U-'+role,tokens[role]);await compare('/dashboard/'+role+'?userId=SYN-U-admin',tokens[role]);await compare('/dashboard/admin',tokens[role]);await compare('/reports/summary',tokens[role]);}}
 for(const role of roles.filter(x=>x!=='admin')){await compare('/dashboard/'+role,tokens.admin);await compare('/dashboard/'+role+'?userId=SYN-U-'+role,tokens.admin);}
 await compare('/dashboard/UNKNOWN',tokens.admin);
 const summary=await compare('/reports/summary',tokens.admin);await compare('/reports/access',tokens.admin);
 for(const q of ['?status='+encodeURIComponent('正常'),'?gate='+encodeURIComponent('东门'),'?status=missing','?status=&gate=','?status='+encodeURIComponent('异常')+'&gate='+encodeURIComponent('东门')])await compare('/reports/access'+q,tokens.admin);
 const ad=await connect(),pd=await connect('appointment'),ed=await incidentDb();try{const count=async(db,t)=>Number((await db.query('SELECT COUNT(*) n FROM '+t))[0][0].n);check('sql-actual-counts',summary.body.data.access.total===await count(ad,'access_records')&&summary.body.data.appointments.total===await count(pd,'appointments')&&summary.body.data.exceptions.total===await count(ed,'exceptions')&&summary.body.data.devices.total===await count(ad,'devices'));}finally{await ad.end();await pd.end();await ed.end();}
 const h=await call('GET','http://127.0.0.1:19861/api/health');check('health-actual-all-dependencies',h.status===200&&h.body.data.service==='campus-access-api'&&h.body.data.dataFile===null&&h.body.data.store.database===null&&h.body.data.store.tables.length===18);
 check('missing-token401',(await call('GET','http://127.0.0.1:19861/api/reports/summary')).status===401);check('invalid-token401',(await call('GET','http://127.0.0.1:19861/api/dashboard/visitor',null,'SYN-invalid')).status===401);
 await compare('/reports/summary',null);await compare('/dashboard/visitor','SYN-invalid');
 try{const disabled=await call('PATCH','/users/SYN-U-guard',{status:'停用'},tokens.admin);check('disabled-fixture-actual-update',disabled.status===200);await compare('/dashboard/guard',tokens.guard);}finally{await call('PATCH','/users/SYN-U-guard',{status:'启用'},tokens.admin);}
 complete=true;save();console.log(JSON.stringify({evidence:out,assertions:results.length,pass:true}));
}catch(e){save();console.error(JSON.stringify({evidence:out,error:e.name,failed:results.at(-1)?.name}));process.exitCode=1;}finally{for(const t of Object.values(tokens))await call('POST','/auth/logout',{},t).catch(()=>{});}
