// Public versions only. Credentials remain in existing in-memory config.
import fs from'node:fs';import path from'node:path';import{spawnSync}from'node:child_process';import{config as c,mysql}from'./p7-http.mjs';
const jdk=JSON.parse(fs.readFileSync('.p1-local/jdk.json','utf8').replace(/^\uFEFF/,''));
function version(exe,args){const r=spawnSync(exe,args,{encoding:'utf8',windowsHide:true});return{exitCode:r.status,output:(r.stdout||'')+(r.stderr||'')};}
const db=await mysql.createConnection({host:c.host,port:c.port,user:c.username,password:c.password,database:c.database});let mysqlVersion;
try{mysqlVersion=(await db.query('SELECT VERSION() AS version'))[0][0].version;}finally{await db.end();}
const report={nodeVersion:process.version,mysqlVersion,isolatedJdk:version(path.join(jdk.javaHome,'bin/java.exe'),['-version']),defaultJdk:version('java',['-version']),globalJavaEnvironmentModifiedByP7:false};fs.writeFileSync('docs/p7-evidence/environment.json',JSON.stringify(report,null,2));console.log(JSON.stringify({mysqlVersion,nodeVersion:process.version,isolatedJdkExit:report.isolatedJdk.exitCode,defaultJdkExit:report.defaultJdk.exitCode}));
