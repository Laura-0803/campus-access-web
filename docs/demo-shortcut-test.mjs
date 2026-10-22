import fs from'node:fs';import path from'node:path';import{createRequire}from'node:module';import{config as c,mysql}from'./p7-http.mjs';
const req=createRequire(path.join(process.cwd(),'.p2-local/browser-test/package.json')),{chromium}=req('playwright-core'),E='docs/demo-shortcut-evidence',results=[],errors=[];let browser,context;
const check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name);};
const roles=[['学生','student','SYN-STUDENT'],['教职工','teacher','SYN-TEACHER'],['校友','alumni','SYN-ALUMNI'],['门岗','guard','SYN-GUARD'],['管理员','admin','SYN-ADMIN']];
try{
 const accounts=await fetch('http://127.0.0.1:15173/__synthetic-demo/accounts').then(x=>x.json());check('five-real-database-accounts',accounts.success&&accounts.data.length===5&&roles.every(x=>accounts.data.some(a=>a.role===x[1]&&a.account===x[2]&&a.enabled)));
 const cross=await fetch('http://127.0.0.1:15173/__synthetic-demo/login',{method:'POST',headers:{Origin:'https://other.invalid','Content-Type':'application/json'},body:JSON.stringify({account:'SYN-ADMIN'})});check('cross-site-denied',cross.status===403);
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 for(const[label,role,account]of roles){
  context=await browser.newContext({viewport:{width:1440,height:1100}});const p=await context.newPage();p.on('pageerror',e=>errors.push({type:e.name}));await p.goto('http://127.0.0.1:15173/login');
  const button=p.getByRole('button',{name:'使用'+label+'演示账号登录',exact:true});await button.waitFor();check('visible-real-account-'+role,(await button.innerText()).includes(account));check('no-old-password-text-'+role,!(await button.innerText()).includes(' / '));
  if(role==='student')await p.screenshot({path:E+'/login-shortcuts.png',fullPage:true,mask:[p.locator('input')]});
  const response=p.waitForResponse(r=>new URL(r.url()).pathname==='/__synthetic-demo/login'&&r.request().method()==='POST');await button.click();check('shortcut-real-login200-'+role,(await response).status()===200);await p.waitForURL('**/'+role);
  check('correct-session-role-'+role,(await p.evaluate(()=>JSON.parse(localStorage.getItem('campus_session')).user.role))===role);
  const permissions=await p.evaluate(async()=>{const t=localStorage.getItem('campus_token');const r=await fetch('/api/reports/summary',{headers:{Authorization:'Bearer '+t}});return r.status;});check('real-server-report-permission-'+role,permissions===(role==='admin'?200:403));
  await p.screenshot({path:E+'/role-'+role+'.png',fullPage:true,mask:[p.locator('input'),p.locator('svg[shape-rendering]')]});
  await p.getByRole('button',{name:'退出',exact:true}).click();await p.waitForURL('**/login');check('actual-logout-'+role,!await p.evaluate(()=>localStorage.getItem('campus_token')));await context.close();context=null;
 }
 const db=await mysql.createConnection({host:c.host,port:c.port,user:c.username,password:c.password,database:c.database});try{const[r]=await db.execute('SELECT username,role,status FROM users WHERE username IN (?,?,?,?,?) ORDER BY username',roles.map(x=>x[2]));fs.writeFileSync(E+'/accounts-verified.json',JSON.stringify(r,null,2));check('roles-remain-database-authoritative',r.length===5&&roles.every(x=>r.some(y=>y.username===x[2]&&y.role===x[1])));}finally{await db.end();}
 const dist=fs.readdirSync('campus-access-web/dist/assets').filter(x=>/\.(js|css)$/.test(x));check('no-private-demo-password-in-dist',dist.every(x=>!fs.readFileSync('campus-access-web/dist/assets/'+x,'utf8').includes(c.demoPassword)));check('no-unhandled-browser-errors',errors.length===0);
}catch(e){results.push({name:'failure',pass:false,errorType:e.name});process.exitCode=1;}finally{await context?.close();await browser?.close();const report={pass:results.every(x=>x.pass),results,errors,browserVersion:browser?.version()};fs.writeFileSync(E+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,assertions:results.length,evidence:E}));}
