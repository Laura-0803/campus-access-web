// Read-only schema, grants and HOLD audit. No tokens, passwords or row payloads exported.
import fs from'node:fs';import crypto from'node:crypto';import{config as c,mysql}from'./p7-http.mjs';
const specs=[['user',c.database,c.username,c.password],['appointment',c.appointmentDatabase,c.appointmentUser,c.appointmentPassword],['access',c.accessDatabase,c.accessUser,c.accessPassword],['exception',c.exceptionDatabase,c.exceptionUser,c.exceptionPassword]],domains=[];let hold;
for(const[name,database,user,password]of specs){
 if(c.host!=='127.0.0.1'||!/^campus_p(?:2_user|3_appointment|4_access|4c_exception)_\d{14}$/.test(database))throw Error('Unsafe audit schema');
 const db=await mysql.createConnection({host:c.host,port:c.port,user,password,database});
 try{
  const tables=(await db.query('SHOW TABLES'))[0].map(r=>Object.values(r)[0]),details=[];
  for(const t of tables){if(!/^\w+$/.test(t))throw Error('Unexpected table');const cols=(await db.query('SHOW COLUMNS FROM `'+t+'`'))[0];const idx=(await db.query('SHOW INDEX FROM `'+t+'`'))[0];details.push({table:t,columns:cols.map(x=>({name:x.Field,type:x.Type,nullable:x.Null,key:x.Key,default:x.Default,extra:x.Extra})),indexes:idx.map(x=>({name:x.Key_name,column:x.Column_name,unique:!x.Non_unique,sequence:x.Seq_in_index}))});}
  const denied={};for(const[other,target]of specs.filter(x=>x[0]!==name)){try{await db.query('SELECT 1 FROM `'+target+'`.`'+(other==='user'?'users':other==='appointment'?'appointments':other==='access'?'access_records':'exceptions')+'` LIMIT 0');denied[other]=false;}catch(e){denied[other]=['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code);}}
  domains.push({domain:name,database,tables:details,otherDomainsDenied:denied,pass:Object.values(denied).every(Boolean)});
  if(name==='appointment'){const rows=(await db.query('SELECT * FROM appointment_issuance WHERE hold_reason IS NOT NULL ORDER BY appointment_id'))[0];hold=rows.map(r=>({appointmentId:r.appointment_id,sha256:crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex')}));}
 }finally{await db.end();}
}
const E='docs/p7-evidence/',before=E+'hold-before.json';if(!fs.existsSync(before))fs.writeFileSync(before,JSON.stringify(hold,null,2));
const old=JSON.parse(fs.readFileSync(before)),holdReport={baselineCount:old.length,currentCount:hold.length,unchanged:JSON.stringify(old)===JSON.stringify(hold)};
const report={domains,hold:holdReport,pass:domains.every(x=>x.pass)&&holdReport.unchanged,sqlWritesByAudit:0};const out=E+'database-audit-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({evidence:out,domains:domains.length,physicalTables:domains.reduce((n,d)=>n+d.tables.length,0),pass:report.pass}));if(!report.pass)process.exitCode=1;
