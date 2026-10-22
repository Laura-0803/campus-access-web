from pathlib import Path
s=Path('docs/p5-frontend-regression-browser.mjs').read_text(encoding='utf-8')
s=s.replace('docs/p5-frontend-evidence/flow-','docs/p6-evidence/browser-flow-')
a=s.index('async function client(');b=s.index('\nasync function screenshot',a)
s=s[:a]+'''async function client(p,method,args){return p.evaluate(async({method,args})=>{
 const token=localStorage.getItem('campus_token')||'';
 const base={accessRecords:'/access-records',exceptions:'/exceptions',appointments:'/appointments',qrCodes:'/qr-codes'};
 const path=method==='roleDashboard'?'/dashboard/'+args[0]+'?userId='+encodeURIComponent(args[1]):base[method]+(args[0]||'');
 const response=await fetch('/api'+path,{headers:{Authorization:'Bearer '+token}}),body=await response.json();
 return response.ok&&body.success?{ok:true,data:body.data}:{ok:false};
},{method,args});}'''+s[b:]
s=s.replace("await p.waitForURL('**/'+role);check(","await p.waitForURL('**/'+role);await p.waitForFunction(role=>JSON.parse(localStorage.getItem('campus_session')||'null')?.user?.role===role,role);check(")
s=s.replace("r.headers()['x-p4-service']||r.headers()['x-p3-service']", "r.headers()['x-p6-service']||r.headers()['x-p4-service']||r.headers()['x-p3-service']")
s=s.replace('logout-legacy-denied-','logout-java-aggregate-denied-')
Path('docs/p6-browser-flow.mjs').write_text(s,encoding='utf-8')
