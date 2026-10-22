// Real SQL permission failure on the NEW P3 bridge account only; restore in finally.
// Does not alter blacklist rows, P2 accounts, or any production grants.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const c=JSON.parse(fs.readFileSync('.p3-local/runtime.json','utf8'));if(!/^p3l_\d{14}$/.test(c.legacyUser)||!/^campus_p2_legacy_\d{14}$/.test(c.legacy))throw Error('Only new P3 account may be faulted');
const env={};for(const line of fs.readFileSync('campus-access-web/.env','utf8').split(/\r?\n/)){const m=line.match(/^([^#=]+)=(.*)$/);if(m)env[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');}
if(!env.CAMPUS_DB_USER||!env.CAMPUS_DB_PASSWORD)throw Error('Explicit grant manager required');
const req=createRequire(path.join(process.cwd(),'campus-access-web/package.json')),db=await req('mysql2/promise').createConnection({host:env.CAMPUS_DB_HOST||'127.0.0.1',port:c.port,user:env.CAMPUS_DB_USER,password:env.CAMPUS_DB_PASSWORD}),out='docs/p3-evidence/blacklist-failure-'+Date.now()+'.json',results=[];let revoked=false,restored=false;
function save(complete=false){fs.writeFileSync(out,JSON.stringify({results,complete,pass:complete&&restored&&results.every(x=>x.pass),onlyNewP3AccountChanged:true,originalBusinessRowsChanged:0,appointmentCreateOrReviewTested:false},null,2));}
function check(name,ok,detail={}){results.push({name,pass:!!ok,...detail});save();if(!ok)throw Error(name);}
async function call(){const r=await fetch('http://127.0.0.1:19830/internal/blacklist-check',{method:'POST',headers:{'Content-Type':'application/json','X-Campus-Internal':c.internalKey},body:JSON.stringify({credential:'990000200001019999'}),signal:AbortSignal.timeout(4000)});return{status:r.status,body:await r.json()};}
try{
 let r=await call();check('blacklist-hit-before-failure',r.status===200&&r.body.available===true&&r.body.blocked===true);
 await db.query('REVOKE SELECT ON `'+c.legacy+"`.`blacklist` FROM ?@'127.0.0.1'",[c.legacyUser]);revoked=true;
 r=await call();check('real-blacklist-select-failure-is-503',r.status===503&&r.body.available===false,{status:r.status});check('failure-not-reported-as-unblocked',!Object.hasOwn(r.body,'blocked'));
}catch(e){console.error(JSON.stringify({evidence:out,failed:e.code||e.message}));process.exitCode=1;}
finally{if(revoked)await db.query('GRANT SELECT ON `'+c.legacy+"`.`blacklist` TO ?@'127.0.0.1'",[c.legacyUser]);restored=true;try{const r=await call();check('blacklist-grant-restored-and-hit-again',r.status===200&&r.body.available===true&&r.body.blocked===true);}catch{process.exitCode=1;}await db.end();save(!process.exitCode);if(!process.exitCode)console.log(JSON.stringify({evidence:out,assertions:results.length,pass:true}));}
