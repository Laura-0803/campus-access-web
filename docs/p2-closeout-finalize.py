"""Final read-only preservation and bounded shutdown of P2-owned processes only."""
from pathlib import Path
import json,subprocess,hashlib,csv,socket,time
R=Path(__file__).resolve().parents[1];E=R/'docs/p2-evidence'
state=R/'.p2-local/processes.json';owned=json.loads(state.read_text()) if state.exists() else []
checks=[]
for name,command in [('source-git',['python','docs/p2-preflight.py']),('database-backups',['node','docs/p1-check-preservation.mjs','docs/p2-evidence/closeout-preservation.json']),('isolation',['node','docs/p2-closeout-check.mjs'])]:
 p=subprocess.run(command,cwd=R,capture_output=True,encoding='utf-8',errors='replace')
 (E/('closeout-'+name+'.log')).write_text(p.stdout+p.stderr,encoding='utf-8')
 checks.append({'name':name,'exitCode':p.returncode})
stop=subprocess.run(['python','docs/p2-runtime.py','stop'],cwd=R,capture_output=True,encoding='utf-8',errors='replace')
ports=[19761,19762,19800,19811,19812,19830,15173,15174]
def listeners():
 result={}
 for port in ports:
  with socket.socket() as s:s.settimeout(.2);result[str(port)]=s.connect_ex(('127.0.0.1',port))==0
 return result
deadline=time.monotonic()+15
while True:
 observed=listeners()
 if not any(observed.values()) or time.monotonic()>deadline:break
 time.sleep(.2)
browser_check=subprocess.run(['powershell','-NoProfile','-Command',"@(Get-CimInstance Win32_Process -Filter \"Name = 'msedge.exe'\" | Where-Object { $_.CommandLine -match 'playwright_chromiumdev_profile' } | Select-Object -ExpandProperty ProcessId) | ConvertTo-Json -Compress"],capture_output=True,encoding='utf-8',errors='replace')
remaining=json.loads(browser_check.stdout) if browser_check.stdout.strip() else []
if isinstance(remaining,int):remaining=[remaining]
previous=json.loads((E/'summary.json').read_text());artifacts=[]
browser_file=sorted(E.glob('browser-*/report.json'),key=lambda p:p.stat().st_mtime)[-1]
browser_result=json.loads(browser_file.read_text());assert browser_result['pass'] and all(x['pass'] for x in browser_result['results'])
for item in previous['artifacts']:
 jar=R/'backend'/item['module']/'target'/(item['module']+'-0.2.0-SNAPSHOT.jar')
 artifacts.append({'module':item['module'],'matchesPreviouslyVerifiedJar':hashlib.sha256(jar.read_bytes()).hexdigest()==item['sha256']})
preflight=sorted(E.glob('preflight-*.json'),key=lambda p:p.stat().st_mtime)[-1]
pre=json.loads(preflight.read_text());pres=json.loads((E/'closeout-preservation.json').read_text());iso=json.loads((E/'closeout-isolation.json').read_text())
sms=json.loads((E/'batch1-1792408510168.json').read_text());assert sms['pass']
report={'scope':'P2 closeout, isolated only','browserEvidence':browser_file.relative_to(R).as_posix(),'browserAssertions':len(browser_result['results']),'browserPass':browser_result['pass'],'smsRerunEvidence':'docs/p2-evidence/batch1-1792408510168.json','smsAssertions':len(sms['results']),'smsPass':sms['pass'],'prior330AssertionsRetained':True,'candidateApis':33,'implementedApis':32,'personDeleteImplemented':False,'personDeleteDesignOnly':True,'p2OverallAccepted':False,'realSmsDeliveryTested':False,'originalSourceFiles':len(pre['originalSourceChecks']),'originalSourceUnchanged':pre['originalSourceUnchanged'],'preflightEvidence':preflight.relative_to(R).as_posix(),'originalDatabaseTables':len(pres['tables']),'originalDatabaseUnchanged':pres['originalDatabaseUnchanged'],'backupChecks':pres['backupChecks'],'p2IsolationPass':iso['pass'],'trackedSensitiveFiles':pre['trackedSensitiveFiles'],'checks':checks,'ownedProcessesBeforeStop':owned,'stopExitCode':stop.returncode,'listenersAfterStop':observed,'remainingOwnedEdgePids':remaining,'edgeProcessCheckExitCode':browser_check.returncode,'artifacts':artifacts,'newMavenBuildRun':False,'originalPortsNotTouched':[3001,5173],'p3Started':False}
report['allOwnedProcessesStopped']=stop.returncode==0 and not any(observed.values()) and not remaining and browser_check.returncode==0
report['closeoutChecksPass']=all(x['exitCode']==0 for x in checks) and all(x['matchesPreviouslyVerifiedJar'] for x in artifacts) and report['allOwnedProcessesStopped']
(E/'closeout-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'originalFilesUnchanged':report['originalSourceUnchanged'],'originalTablesUnchanged':report['originalDatabaseUnchanged'],'allOwnedProcessesStopped':report['allOwnedProcessesStopped'],'closeoutChecksPass':report['closeoutChecksPass']}))
if not report['closeoutChecksPass']:raise SystemExit(1)
