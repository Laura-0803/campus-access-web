// P3-only isolated adapter derived from reviewed P2 adapter. Never mutates original source.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=process.cwd(),source=path.join(root,'backend/legacy-adapter/server.mjs');let code=fs.readFileSync(source,'utf8');
function replace(from,to){if(!code.includes(from))throw Error('P2 adapter template changed; inspect before proceeding');code=code.replace(from,to);}
code=code.replaceAll('.p2-local','.p3-local');
replace("from './store.mjs'","from "+JSON.stringify(pathToFileURL(path.join(root,'backend/legacy-adapter/store.mjs')).href));
replace("!g.includes(' ON `'+config.legacy+'`.*')","!['access_records','exceptions','devices','qr_codes','settings','gates','access_rules','blacklist','user_domain_outbox'].some(t=>g.includes(' ON `'+config.legacy+'`.`'+t+'`'))");
replace("appointments:'appointments',",'');
replace("['dashboard','appointments','accessRecords'","['dashboard','accessRecords'");
replace("const own=['users'","const own=['appointments','users'");
replace('legacy=await load();const data=',`legacy=await load();const appointmentResponse=await fetch('http://127.0.0.1:19821/internal/appointments',{headers:{'X-Campus-Internal':config.internalKey},signal:AbortSignal.timeout(1800)});if(!appointmentResponse.ok)throw Error('Appointment projection unavailable');legacy.appointments=await appointmentResponse.json();const data=`);
replace('const data=await load();res.json({available:true,blocked:',"const [blacklistRows]=await pool.query('SELECT id,credential_no,status FROM blacklist');const data={blacklist:blacklistRows.map(view)};res.json({available:true,blocked:");
const target=path.join(root,'.p3-local/adapter-runtime.mjs');fs.writeFileSync(target,code);await import(pathToFileURL(target).href);
