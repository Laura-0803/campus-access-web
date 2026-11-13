// 预约域迁移桥接器：在预约服务切换期间组合旧接口与预约域只读投影，不修改旧后端源码。
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=process.cwd(),source=path.join(root,'backend/migration-bridges/user-domain-cutover/server.mjs');let code=fs.readFileSync(source,'utf8');
function replace(from,to){if(!code.includes(from))throw Error('用户域桥接模板已变更，请先复核迁移规则');code=code.replace(from,to);}
code=code.replaceAll('.migration-runtime/user-domain','.migration-runtime/appointment-domain');
replace("from './store.mjs'","from "+JSON.stringify(pathToFileURL(path.join(root,'backend/migration-bridges/user-domain-cutover/store.mjs')).href));
replace("!g.includes(' ON `'+config.legacy+'`.*')","!['access_records','exceptions','devices','qr_codes','settings','gates','access_rules','blacklist','user_domain_outbox'].some(t=>g.includes(' ON `'+config.legacy+'`.`'+t+'`'))");
replace("appointments:'appointments',",'');
replace("['dashboard','appointments','accessRecords'","['dashboard','accessRecords'");
replace("const own=['users'","const own=['appointments','users'");
replace('legacy=await load();const data=',`legacy=await load();const appointmentResponse=await fetch('http://127.0.0.1:19821/internal/appointments',{headers:{'X-Campus-Internal':config.internalKey},signal:AbortSignal.timeout(1800)});if(!appointmentResponse.ok)throw Error('Appointment projection unavailable');legacy.appointments=await appointmentResponse.json();const data=`);
replace('const data=await load();res.json({available:true,blocked:',"const [blacklistRows]=await pool.query('SELECT id,credential_no,status FROM blacklist');const data={blacklist:blacklistRows.map(view)};res.json({available:true,blocked:");
const target=path.join(root,'.migration-runtime/appointment-domain/adapter-runtime.mjs');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,code);await import(pathToFileURL(target).href);
