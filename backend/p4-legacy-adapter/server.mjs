// Isolated transition only. Original Express and approved P2/P3 adapters stay unchanged.
import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';
const root=process.cwd();let code=fs.readFileSync('backend/legacy-adapter/server.mjs','utf8');function replace(a,b){if(!code.includes(a))throw Error('Reviewed template changed');code=code.replace(a,b);}
code=code.replaceAll('.p2-local','.p4-local');replace("from './store.mjs'",'from '+JSON.stringify(pathToFileURL(path.join(root,'backend/legacy-adapter/store.mjs')).href));
replace("!g.includes(' ON `'+config.legacy+'`.*')","!['exceptions','blacklist','user_domain_outbox'].some(t=>g.includes(' ON `'+config.legacy+'`.`'+t+'`'))");
replace("const tableMap={accessRecords:'access_records',appointments:'appointments',exceptions:'exceptions',devices:'devices',qrCodes:'qr_codes',settings:'settings',gates:'gates',accessRules:'access_rules',blacklist:'blacklist'};","const tableMap={exceptions:'exceptions',blacklist:'blacklist'};");
replace("const own=['users'","const own=['appointments','accessRecords','qrCodes','devices','settings','gates','accessRules','users'");
replace("['dashboard','appointments','accessRecords','exceptions','devices','credentials','reports','settings']","['dashboard','exceptions','reports','settings']");
replace('legacy=await load();const data=',`legacy=await load();for(const [url,kind]of [['http://127.0.0.1:19821/internal/appointments','appointments'],['http://127.0.0.1:19841/internal/projection','access']]){const response=await fetch(url,{headers:{'X-Campus-Internal':config.internalKey},signal:AbortSignal.timeout(1800)});if(!response.ok)throw Error('Domain projection unavailable');const view=await response.json();if(kind==='appointments')legacy.appointments=view;else Object.assign(legacy,view);}const data=`);
replace('const data=await load();res.json({available:true,blocked:',"const [rows]=await pool.query('SELECT id,name,credential_no,status,reason FROM blacklist');const data={blacklist:rows.map(view)};res.json({available:true,blocked:");
replace('{findActiveBlacklistByCredential}=','{findActiveBlacklistByCredential,isActiveBlacklistItem,blacklistCredentialMatches}=');
const endpoints=String.raw`
app.post('/internal/access-blacklist',async(req,res)=>{
 if(!same(req.get('X-Campus-Internal'),config.internalKey))return res.sendStatus(403);
 try{const[rows]=await pool.query('SELECT id,name,credential_no,status,reason FROM blacklist');const p=req.body.person||{},q=req.body.qrCode||{},values=[p.name,p.code,p.idNumber,p.phone,q.ownerName,q.token,req.body.credential].filter(Boolean).map(String);const hit=rows.map(view).find(item=>isActiveBlacklistItem(item)&&(values.includes(String(item.name))||values.some(v=>blacklistCredentialMatches(item.credentialNo,v))));res.json({available:true,blocked:!!hit,reason:hit?(hit.reason||hit.name):''});}catch{res.status(503).json({available:false});}
});
app.post('/internal/access-result',async(req,res)=>{
 if(!same(req.get('X-Campus-Internal'),config.internalKey))return res.sendStatus(403);
 const{record,reason,allowed}=req.body||{};if(!record||!/^R[A-Z0-9]+$/.test(record.id)||typeof allowed!=='boolean'||typeof reason!=='string')return res.status(400).json({accepted:false});
 try{if(!allowed){const risk=/黑名单|强行|冒用/.test(reason)?'高风险':/未找到|不允许|过期|不可用/.test(reason)?'中风险':'低风险';await pool.query('INSERT INTO exceptions(id,time,person,person_type,gate,method,type,reason,risk,status,suggestion,actions,sort_order)SELECT ?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(MIN(sort_order),0)-1 FROM exceptions ON DUPLICATE KEY UPDATE id=id',['E'+record.id,record.time,record.name,record.type,record.gate,record.method,record.method+'失败',reason,risk,'待处理',risk==='高风险'?'建议拒绝通行并立即上报保卫处管理员复核。':'建议门岗核验身份信息并联系相关人员确认，确认无误后可人工核验后放行。','[]']);}res.json({accepted:true,recordId:record.id});}catch{res.status(503).json({accepted:false});}
});
`;
replace('let requestLane=Promise.resolve();',endpoints+'\nlet requestLane=Promise.resolve();');
const target=path.join(root,'.p4-local/adapter-runtime.mjs');fs.writeFileSync(target,code);await import(pathToFileURL(target).href);
