// Real installed Edge, unmodified original React, real P3 query APIs and isolated SQL.
// Approved P3 creation and nonfinal review; final QR branch remains explicitly unavailable.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const browserReq=createRequire(path.join(process.cwd(),'.p2-local/browser-test/package.json')),{chromium}=browserReq('playwright-core');
const c=JSON.parse(fs.readFileSync('.p3-local/runtime.json','utf8')),dir='docs/p3-evidence/browser-'+Date.now();fs.mkdirSync(dir,{recursive:true});
const results=[],http=[],pageErrors=[];let browser,current='initial',complete=false;
function save(){fs.writeFileSync(dir+'/report.json',JSON.stringify({results,http,pageErrors,complete,pass:complete&&results.every(x=>x.pass),browserVersion:browser?.version(),playwrightVersion:browserReq('playwright-core/package.json').version,creationBusinessPassed:complete,nonfinalReviewBusinessPassed:complete,realQrIssuanceTested:false,originalReactModified:false},null,2));}
function check(name,ok,detail={}){current=name;results.push({name,pass:!!ok,...detail});save();if(!ok)throw Error(name);}
async function call(p,method,url,body,token){return p.evaluate(async({method,url,body,token})=>{const r=await fetch('/api'+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),service:r.headers.get('X-P3-Service')};},{method,url,body,token});}
async function wait(f){const until=Date.now()+12000;while(Date.now()<until){if(await f())return true;await new Promise(r=>setTimeout(r,150));}return false;}
try{
 const login=await fetch('http://127.0.0.1:19800/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:'SYN-VISITOR',password:c.demoPassword})});const t=(await login.json()).data.token,fixtures={};
 for(const role of ['student','admin']){const r=await fetch('http://127.0.0.1:19800/api/appointments',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify({host:'SYN-P-'+role,reason:'合成浏览器审批夹具',visitStart:'2099-10-21 09:00'})});check('browser-fixture-'+role,r.status===201);fixtures[role]=(await r.json()).data.id;}
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 for(const role of ['student','teacher','visitor','alumni','guard','admin']){
  current='role-'+role;const ctx=await browser.newContext({viewport:{width:1440,height:1000}}),p=await ctx.newPage();p.setDefaultTimeout(12000);
  p.on('pageerror',()=>{pageErrors.push({phase:current});save();});
  p.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/')){http.push({phase:current,method:r.request().method(),path:u.pathname,status:r.status(),service:r.headers()['x-p3-service']||null});save();}});
  await p.goto('http://127.0.0.1:15173/login');await p.getByLabel('账号',{exact:true}).fill('SYN-'+role.toUpperCase());await p.getByLabel('密码',{exact:true}).fill(c.demoPassword);await p.getByRole('button',{name:'进入系统',exact:true}).click();await p.waitForURL('**/'+role);
  const session=await p.evaluate(()=>JSON.parse(localStorage.getItem('campus_session')));check('p2-login-'+role,session.user.role===role);
  check('original-styles-'+role,await p.evaluate(()=>getComputedStyle(document.querySelector('header')).display==='flex'));
  await p.goto('http://127.0.0.1:15173/profile');const phone=p.locator('label').filter({hasText:'联系电话'}).locator('input');await phone.waitFor();await phone.fill(c.allowedPhones[['student','teacher','visitor','alumni','guard','admin'].indexOf(role)]);const saved=p.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname==='/api/profiles/me');await p.getByRole('button',{name:'保存联系方式',exact:true}).click();const response=await saved;check('p2-profile-save-'+role,response.status()===200&&await wait(()=>p.getByText('个人资料已保存',{exact:true}).isVisible()));
  const api=await call(p,'GET','/appointments',null,session.token);check('appointment-role-'+role,api.status===(['alumni','guard'].includes(role)?403:200)&&api.service==='appointment-service');
  if(!['alumni','guard'].includes(role)){
   const page=role==='admin'?'/appointments':role==='visitor'?'/appointment-status':'/review';const loaded=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/appointments'&&r.status()===200);await p.goto('http://127.0.0.1:15173'+page);await loaded;
   const heading=role==='admin'?'预约监管':role==='visitor'?'预约状态查询':'访客预约审核';await p.getByRole('heading',{name:heading,exact:true}).waitFor();check('appointment-list-page-'+role,await p.getByRole('table').isVisible());
   const field=p.locator('label').filter({hasText:/^状态/}).locator('select');await field.selectOption('未通过');const filtered=p.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/api/appointments'&&u.searchParams.get('status')==='未通过';});await p.getByRole('button',{name:'查询',exact:true}).click();const fr=await filtered;const filteredData=await call(p,'GET','/appointments?status='+encodeURIComponent('未通过'),null,session.token);check('appointment-filter-'+role,fr.status()===200&&filteredData.body.data.every(x=>x.status==='未通过'));
   const reset=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/appointments'&&!new URL(r.url()).search);await p.getByRole('button',{name:'重置',exact:true}).click();await reset;
   const detail=await call(p,'GET','/appointments/SYN-APT',null,session.token);check('appointment-detail-browser-http-'+role,detail.status===(role==='teacher'?403:200),{surface:'original frontend has no detail modal; real browser HTTP'});
   if(role==='student'||role==='admin'){
    const id=fixtures[role],row=p.getByRole('row').filter({hasText:id});const review=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/appointments/'+id+'/review');await row.getByRole('button',{name:role==='student'?'通过并提交保卫处':'保卫处通过',exact:true}).click();const response=await review;
    if(role==='student'){const data=await response.json();check('host-approve-browser',response.status()===200&&data.data.appointment.status==='待保卫处审核'&&data.data.qrCode===null);}
    else {check('final-approval-error-visible',response.status()===503&&await wait(()=>p.getByText('通行凭证签发服务尚未启用，暂不能完成最终审批',{exact:true}).first().isVisible()));const denied=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/appointments/'+id+'/review');await row.getByRole('button',{name:'驳回',exact:true}).click();const rejected=await denied;check('security-reject-browser',rejected.status()===200&&(await rejected.json()).data.appointment.status==='未通过');}
   }
   await p.screenshot({path:dir+'/'+role+'-appointments.png',fullPage:true});
  }else{
   await p.goto('http://127.0.0.1:15173/appointments');await p.waitForURL('**/'+role);check('appointment-management-page-forbidden-'+role,new URL(p.url()).pathname==='/'+role);
  }
  if(role==='visitor'){
   current='visitor-create-gate';const hostsReady=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/appointments/hosts'&&r.status()===200);await p.goto('http://127.0.0.1:15173/visitor');await hostsReady;const form=p.locator('form').first();
   check('visitor-form-identity-prefilled',await wait(async()=>await form.locator('label').filter({hasText:/^访客姓名/}).locator('input').inputValue()==='合成访客'&&await form.locator('label').filter({hasText:/^联系电话/}).locator('input').inputValue()===c.allowedPhones[2]));
   await form.locator('label').filter({hasText:/^被访人编号/}).locator('input').fill('SYN-STUDENT');await form.locator('label').filter({hasText:/^来访事由/}).locator('input').fill('合成P3待审批门禁验证');await form.locator('input[type=datetime-local]').nth(0).fill('2099-10-21T09:00');await form.locator('input[type=datetime-local]').nth(1).fill('2099-10-21T12:00');
   const submitted=p.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/appointments');await p.getByRole('button',{name:'提交预约申请',exact:true}).click();const br=await submitted;const created=await br.json();check('visitor-create-browser',br.status()===201&&created.data.status==='待被访人审核'&&created.data.visitorId==='SYN-P-visitor');check('created-visible-through-java',(await call(p,'GET','/appointments/'+created.data.id,null,session.token)).body.data.id===created.data.id);await p.screenshot({path:dir+'/visitor-create-success.png',fullPage:true,mask:[p.locator('input')]});
  }
  const recordsPath='/api/'+(['admin','guard'].includes(role)?'access-records':'dashboard/'+role),record=p.waitForResponse(r=>new URL(r.url()).pathname===recordsPath&&r.status()===200);await p.goto('http://127.0.0.1:15173/records');await record;await p.getByRole('heading',{name:['admin','guard'].includes(role)?'出入记录查询':'我的出入记录',exact:true}).waitFor();check('legacy-record-page-'+role,true);
  if(role!=='guard'){
   const expected='/api/'+(role==='admin'?'exceptions':'dashboard/'+role),loaded=p.waitForResponse(r=>new URL(r.url()).pathname===expected&&r.status()===200);await p.goto('http://127.0.0.1:15173/exceptions');await loaded;check('legacy-exception-page-'+role,await p.getByRole('heading',{name:role==='admin'?'异常事件分析':'我的异常记录',exact:true}).isVisible());
  }
  await p.getByRole('button',{name:'退出',exact:true}).click();await p.waitForURL('**/login');check('logout-appointment-denied-'+role,(await call(p,'GET','/appointments',null,session.token)).status===401);check('logout-legacy-denied-'+role,(await call(p,'GET','/dashboard/'+role,null,session.token)).status===401);await ctx.close();
 }
 check('no-unhandled-page-exceptions',pageErrors.length===0);complete=true;save();console.log(JSON.stringify({evidence:dir,assertions:results.length,pass:true,finalQrApprovalAwaitingP4:true}));
}catch(e){results.push({name:current,pass:false,errorType:e.name});save();console.error(JSON.stringify({evidence:dir,phase:current,errorType:e.name}));process.exitCode=1;}finally{await browser?.close();save();}
