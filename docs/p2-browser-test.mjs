// Real installed Edge + original React + real isolated HTTP/MySQL. No HAR, trace or secret-bearing errors.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const req=createRequire(path.join(process.cwd(),'.p2-local/browser-test/package.json'));
const {chromium}=req('playwright-core');
const appReq=createRequire(path.join(process.cwd(),'campus-access-web/package.json'));
const c=JSON.parse(fs.readFileSync('.p2-local/runtime.json','utf8'));
if(!/^campus_p2_user_\d{14}$/.test(c.database))throw Error('Unsafe synthetic database');
const dir='docs/p2-evidence/browser-'+Date.now();fs.mkdirSync(dir,{recursive:true});
const results=[],errors=[],http=[],roles=['student','teacher','visitor','alumni','guard','admin'];
let browser,db,current='initialization';
function save(){fs.writeFileSync(dir+'/report.json',JSON.stringify({browser:browser?.version(),runner:'playwright-core / real headless installed Edge',originalReactModified:false,results,console:errors,http,pass:results.length>0&&results.every(x=>x.pass),realSmsDeliveryTested:false},null,2));}
function check(name,ok,details={}){current=name;results.push({name,pass:!!ok,...details});save();if(!ok)throw Error(name);}
async function wait(checker){const end=Date.now()+15000;while(Date.now()<end){if(await checker())return true;await new Promise(r=>setTimeout(r,150));}return false;}
function field(p,label){return p.locator('form').first().locator('label').filter({hasText:new RegExp('^'+label)}).first().locator('input');}
async function api(p,method,url,body,token){return p.evaluate(async({method,url,body,token})=>{const r=await fetch(url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,body:await r.json()};},{method,url:'/api'+url,body,token});}
async function session(p){return p.evaluate(()=>JSON.parse(localStorage.getItem('campus_session')));}
async function login(p,role){await p.goto('http://127.0.0.1:15173/login');await p.getByLabel('账号',{exact:true}).fill('SYN-'+role.toUpperCase());await p.getByLabel('密码',{exact:true}).fill(c.demoPassword);await p.getByRole('button',{name:'进入系统',exact:true}).click();await p.waitForURL('**/'+role);check('login-home-'+role,(await session(p))?.user.role===role);}
async function fresh(){const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();p.setDefaultTimeout(12000);
 p.on('pageerror',()=>{errors.push({kind:'unhandled-pageerror',phase:current});save();});
 p.on('console',m=>{if(['warning','error'].includes(m.type())){const text=m.text();errors.push({kind:m.type(),phase:current,category:text.includes('Failed to load resource')?'http-resource':text.includes('React Router')?'router-future-warning':text.includes('width')||text.includes('height')?'chart-dimension':text.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,'[redacted]').replace(/\b\d{6}\b/g,'[redacted]').slice(0,160)});save();}});
 p.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/')){http.push({method:r.request().method(),path:u.pathname,status:r.status()});save();}});return{ctx,p};}
try{
 browser=await chromium.launch({executablePath:process.env.P2_BROWSER_EXE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 db=await appReq('mysql2/promise').createConnection({host:c.host,port:c.port,user:c.username,password:c.password,database:c.database});
 for(const role of roles){const{ctx,p}=await fresh();current='role-'+role;await login(p,role);
 check('dashboard-loaded-'+role,await wait(async()=>http.some(x=>x.path==='/api/dashboard/'+role&&x.status===200)));
 check('original-tailwind-layout-'+role,await p.evaluate(()=>getComputedStyle(document.querySelector('header')).display==='flex'));
 await p.screenshot({path:dir+'/'+role+'-home.png',fullPage:true});
 await p.goto('http://127.0.0.1:15173/profile');await p.getByRole('button',{name:'保存联系方式',exact:true}).waitFor();
 const phone=p.locator('label').filter({hasText:'联系电话'}).locator('input'),originalPhone=c.allowedPhones[roles.indexOf(role)],changedPhone='1990001'+String(roles.indexOf(role)).padStart(4,'0');await phone.fill(changedPhone);await p.getByRole('button',{name:'保存联系方式',exact:true}).click();
 check('profile-save-'+role,await wait(()=>p.getByText('个人资料已保存',{exact:true}).isVisible()));
 const s=await session(p);const data=await api(p,'GET','/profiles/me?userId='+encodeURIComponent(s.user.id),null,s.token);check('profile-persisted-'+role,data.status===200&&data.body.data.person.phone===changedPhone);
 const restored=p.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname==='/api/profiles/me');await phone.fill(originalPhone);await p.getByRole('button',{name:'保存联系方式',exact:true}).click();const restoredBody=await(await restored).json();check('profile-fixture-restored-'+role,restoredBody.data?.person.phone===originalPhone);
 if(role!=='admin'){await p.goto('http://127.0.0.1:15173/people');await p.waitForURL('**/'+role);check('admin-page-blocked-'+role,new URL(p.url()).pathname==='/'+role);check('admin-api-blocked-'+role,(await api(p,'GET','/users',null,s.token)).status===403);}
 const legacyPath=role==='alumni'?'/qr-codes':role==='guard'?'/access-records':'/appointments';const legacy=await api(p,'GET',legacyPath,null,s.token);check('legacy-browser-http-'+role,legacy.status===200&&Array.isArray(legacy.body.data));
 const legacyPage={student:'/review',teacher:'/review',visitor:'/appointment-status',alumni:'/alumni-qr',guard:'/records',admin:'/appointments'}[role];
 const pageApi=role==='alumni'?'/dashboard/alumni':legacyPath;
 const pageData=p.waitForResponse(r=>new URL(r.url()).pathname==='/api'+pageApi&&r.status()===200);
 await p.goto('http://127.0.0.1:15173'+legacyPage);await pageData;
 check('legacy-role-page-'+role,new URL(p.url()).pathname===legacyPage&&await p.getByRole('button',{name:'退出',exact:true}).isVisible());
 if(!['guard','admin'].includes(role))for(const ownPage of ['/records','/exceptions']){
  current='personal-'+ownPage.slice(1)+'-navigation-'+role;
  const scoped=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/dashboard/'+role&&r.status()===200);await p.goto('http://127.0.0.1:15173'+ownPage);await scoped;await p.getByRole('heading',{name:ownPage==='/records'?'我的出入记录':'我的异常记录',exact:true}).waitFor();
  const observed=await api(p,'GET','/dashboard/'+role,null,s.token),body=observed.body;check('personal-'+ownPage.slice(1)+'-page-'+role,body.success===true&&body.data.person?.id==='SYN-P-'+role&&Array.isArray(body.data[ownPage==='/records'?'records':'exceptions']));
 }
 await p.getByRole('button',{name:'退出',exact:true}).click();await p.waitForURL('**/login');check('logout-java-'+role,(await api(p,'GET','/auth/me',null,s.token)).status===401);check('logout-express-'+role,(await api(p,'GET',legacyPath,null,s.token)).status===401);await ctx.close();}
 // Use the actual PeopleManagementPage: it creates and updates both person and user.
 {const{ctx,p}=await fresh();current='admin-person-user-ui';await login(p,'admin');await p.goto('http://127.0.0.1:15173/people');
 const suffix=String(Date.now()).slice(-7),code='209'+suffix,account=code,initialPassword=c.demoPassword.slice(0,24);
 const inputs={姓名:'合成浏览器学生',学号:code,身份证号:'990000200001010088',电话:c.allowedPhones[11],学院:'合成学院',班级:'合成班级',登录账号:account,初始密码:initialPassword};
 for(const[k,v]of Object.entries(inputs)){current='admin-create-fill-'+k;await field(p,k).fill(v);}
 await p.getByRole('button',{name:'新增人员',exact:true}).click();check('admin-create-ui',await wait(()=>p.getByText('合成浏览器学生 已新增',{exact:true}).isVisible()));
 const s=await session(p),users=await api(p,'GET','/users',null,s.token),user=users.body.data.find(x=>x.username===account);check('admin-created-user-real-sql',!!user&&user.role==='student');
 let row=p.getByRole('row').filter({hasText:account});await row.getByRole('button',{name:'编辑',exact:true}).click();await field(p,'姓名').fill('合成浏览器更新');await p.getByRole('button',{name:'保存人员',exact:true}).click();check('admin-modify-ui',await wait(()=>p.getByText('合成浏览器更新 已更新',{exact:true}).isVisible()));
 row=p.getByRole('row').filter({hasText:account});await row.getByRole('button',{name:'停用',exact:true}).click();check('admin-person-disable-ui',await wait(()=>p.getByText('合成浏览器更新 状态已更新为 停用',{exact:true}).isVisible()));
 // There is no routed account-status editor in original App.jsx; exercise the real API from browser explicitly.
 const before=await api(p,'POST','/auth/login',{account,password:initialPassword});check('created-account-browser-login',before.status===200);
 const off=await api(p,'PATCH','/users/'+user.id,{status:'停用'},s.token);check('admin-user-disable-browser-http',off.status===200&&off.body.data.status==='停用',{surface:'browser HTTP; original routed people UI only changes person status'});
 const attempt=await api(p,'POST','/auth/login',{account,password:initialPassword});check('disabled-account-login-denied',attempt.status===403);check('disabled-token-express-immediate',(await api(p,'GET','/appointments',null,before.body.data.token)).status===403);
 await p.screenshot({path:dir+'/admin-person-managed.png',fullPage:true,mask:[p.locator('input[type=password]')]});await ctx.close();}
 // Demo reset completes with code held only in memory. Screenshots are taken only after it is cleared.
 {const{ctx,p}=await fresh();current='demo-reset';await p.goto('http://127.0.0.1:15173/login');await p.getByRole('button',{name:'忘记密码？',exact:true}).click();
 await field(p,'账号').fill('SYN-STUDENT');await field(p,'绑定手机号').fill(c.allowedPhones[0]);await db.query("DELETE FROM verification_codes WHERE purpose='reset' AND phone=?",[c.allowedPhones[0]]);
 const response=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/reset-code');await p.getByRole('button',{name:'获取验证码',exact:true}).click();const issued=await(await response).json();check('demo-reset-code-present',/^\d{6}$/.test(issued.data?.code));
 await field(p,'验证码').fill(issued.data.code);await field(p,'新密码').fill(c.demoPassword);await field(p,'确认新密码').fill(c.demoPassword);await p.getByRole('button',{name:'重置密码',exact:true}).click();check('demo-reset-ui-complete',await wait(()=>p.getByText('密码已重置，请使用新密码登录',{exact:true}).isVisible()));
 await p.screenshot({path:dir+'/reset-completed.png',mask:[p.locator('input'),p.getByRole('button',{name:/使用.*演示账号登录/})]});await ctx.close();}
 {const{ctx,p}=await fresh();current='normal-sms-ui';await p.goto('http://127.0.0.1:15174/login');await p.getByRole('button',{name:'忘记密码？',exact:true}).click();await field(p,'账号').fill('SYN-STUDENT');await field(p,'绑定手机号').fill(c.allowedPhones[0]);const response=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/reset-code');await p.getByRole('button',{name:'获取验证码',exact:true}).click();const r=await response,b=await r.json();check('normal-sms-503-ui',r.status()===503&&!b.data?.code&&await wait(()=>p.getByText(/短信通道未配置/).isVisible()));await p.screenshot({path:dir+'/normal-sms-unavailable.png',mask:[p.locator('input')]});await ctx.close();}
 check('no-unhandled-browser-exceptions',!errors.some(e=>e.kind==='unhandled-pageerror'));
 console.log(JSON.stringify({evidence:dir,assertions:results.length,pass:true}));
}catch(e){results.push({name:current,pass:false,errorType:e.name,reason:'Browser assertion or locator failed; no raw secret-bearing error persisted'});save();console.error(JSON.stringify({evidence:dir,failedPhase:current,errorType:e.name}));process.exitCode=1;}
finally{await db?.end();await browser?.close();save();}
