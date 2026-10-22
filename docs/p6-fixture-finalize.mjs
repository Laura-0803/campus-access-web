// Restore only the clearly named synthetic P6 blacklist fixtures, preserving their history.
import fs from'node:fs';import{login,call}from'./p5-http.mjs';
const token=await login('admin'),updated=[];let pass=true;
try{const list=await call('GET','/blacklist',null,token);for(const x of list.body.data)if(['合成P6限制对象','合成P6人员限制'].includes(x.name)&&x.reason==='合成隔离拒绝测试'&&x.status!=='已移出'){const r=await call('PATCH','/blacklist/'+x.id,{status:'已移出',removedReason:'合成P6测试收尾解除'},token);updated.push({id:x.id,status:r.status});if(r.status!==200)pass=false;}}finally{await call('POST','/auth/logout',{},token);fs.writeFileSync('docs/p6-evidence/fixture-finalize.json',JSON.stringify({updated,pass},null,2));console.log(JSON.stringify({fixturesUpdated:updated.length,pass}));if(!pass)process.exitCode=1;}
