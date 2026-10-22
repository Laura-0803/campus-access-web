import fs from'node:fs';import{spawn}from'node:child_process';
import http from'node:http';
const E='docs/demo-shortcut-evidence',results=[];let child;
const check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name);};
try{
 for(const body of [{account:'SYN-EXTRA'},{account:'2023210001'}]){const r=await fetch('http://127.0.0.1:15173/__synthetic-demo/login',{method:'POST',headers:{Origin:'http://127.0.0.1:15173','Content-Type':'application/json'},body:JSON.stringify(body)});check('not-whitelisted-'+body.account,r.status===403);}
 const status=await new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port:15173,path:'/__synthetic-demo/accounts',headers:{Host:'other.invalid:15173'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});check('foreign-host-denied',status===403);
 child=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','15174','--strictPort'],{cwd:'campus-access-web',env:{...process.env,P2_DEMO:'false',SPRING_PROFILES_ACTIVE:'normal'},windowsHide:true,stdio:'ignore'});
 const end=Date.now()+15000;let response;while(Date.now()<end){try{response=await fetch('http://127.0.0.1:15174/__synthetic-demo/accounts',{signal:AbortSignal.timeout(1000)});if(response)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 check('normal-mode-has-no-demo-accounts-endpoint',!!response&&!response.headers.get('content-type')?.includes('application/json'));
}catch(e){results.push({name:'failure',pass:false,errorType:e.name});process.exitCode=1;}finally{if(child){child.kill();await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});}const pass=results.every(x=>x.pass);fs.writeFileSync(E+'/boundary-report.json',JSON.stringify({pass,results,temporaryPreviewClosed:true},null,2));console.log(JSON.stringify({pass,assertions:results.length}));}
