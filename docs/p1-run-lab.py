"""P1 loopback lab: layered discovery, real Ribbon, actual Hystrix gates and isolated CRUD.
Each run has a new evidence directory; old failures/backups are never overwritten.
"""
from pathlib import Path
import argparse, concurrent.futures, datetime, hashlib, json, os, socket, subprocess, time
import traceback, urllib.request, urllib.error

ROOT=Path(__file__).resolve().parent.parent
PROJECT=ROOT/'experiments/p1-legacy-lab'
parser=argparse.ArgumentParser()
parser.add_argument('--mode',choices=['diagnosis','full'],default='full')
parser.add_argument('--lease-seconds',type=int,default=90)
parser.add_argument('--timeout',type=int,default=150)
args=parser.parse_args()
assert args.lease_seconds in [9,90], 'Only documented baseline/control lease values allowed'
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
EVIDENCE=ROOT/'docs/p1-evidence'/('resume-'+stamp+'-'+args.mode)
EVIDENCE.mkdir(exist_ok=False)
jdk=json.loads((ROOT/'.p1-local/jdk.json').read_text(encoding='utf-8-sig'))
db=json.loads((ROOT/'.p1-local/database.json').read_text(encoding='utf8'))
assert db['database'].startswith('campus_p1_lab_') and db['username'].startswith('p1_lab_')
env=os.environ.copy()
env.update(LAB_DB_URL=f"jdbc:mysql://127.0.0.1:{db['port']}/{db['database']}?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=UTF-8",LAB_DB_USER=db['username'],LAB_DB_PASSWORD=db['password'])
processes={}; owned=[]; logs=[]
report={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mode':args.mode,
        'leaseSeconds':args.lease_seconds,'renewalSeconds':3 if args.lease_seconds==9 else 10,
        'tests':{},'polls':[],'requests':[],'processes':[],'failures':[]}
def save():
    (EVIDENCE/'live-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def http(port,path,method='GET',body=None):
    request=urllib.request.Request(f'http://127.0.0.1:{port}{path}',data=None if body is None else json.dumps(body).encode(),method=method,headers={'Accept':'application/json','Content-Type':'application/json'})
    before=time.monotonic()
    try:
        with urllib.request.urlopen(request,timeout=8) as r:
            raw=r.read().decode();status=r.status
    except urllib.error.HTTPError as e:
        status=e.code;raw=e.read().decode()
    value=json.loads(raw) if raw else None
    report['requests'].append({'atEpochMs':int(time.time()*1000),'port':port,'path':path,'method':method,'status':status,'elapsedMs':round((time.monotonic()-before)*1000),'response':value})
    return status,value
def safe(port,path):
    try:
        status,data=http(port,path)
        return {'httpStatus':status,'data':data}
    except (OSError,ValueError) as e:return {'error':type(e).__name__}
def wait_for(label,predicate,seconds=None):
    end=time.monotonic()+(seconds or args.timeout); last=None; progress=time.monotonic()
    while time.monotonic()<end:
        try:
            last=predicate()
            if last:
                print(label+': ready',flush=True);return last
        except (OSError,ValueError,KeyError,TypeError): pass
        if time.monotonic()-progress>=15:
            print(label+': still waiting',flush=True);progress=time.monotonic();save()
        time.sleep(.5)
    report['failedWait']=label;save();raise RuntimeError(label+' timed out')
def start(name,module,port,extra=None):
    with socket.socket() as s:
        if s.connect_ex(('127.0.0.1',port))==0:raise RuntimeError(f'Port {port} in use; no external process will be stopped')
    jar=PROJECT/module/'target'/f'{module}-0.1.0-SNAPSHOT.jar'
    assert jar.is_file()
    childenv=env.copy();childenv.update(extra or {})
    log=(EVIDENCE/(name+'-'+str(len(owned))+'.log')).open('xb');logs.append(log)
    command=[str(Path(jdk['javaHome'])/'bin/java.exe'),'-Xms48m','-Xmx256m','-XX:ActiveProcessorCount=2','-Dfile.encoding=UTF-8','-jar',str(jar),f'--server.port={port}','--debug=false','--logging.level.root=INFO',f'--eureka.instance.lease-expiration-duration-in-seconds={args.lease_seconds}',f'--eureka.instance.lease-renewal-interval-in-seconds={report["renewalSeconds"]}']
    if module in ['consumer-service','eureka-server']:command+=['--spring.profiles.active=lab-diagnostics']
    child=subprocess.Popen(command,env=childenv,cwd=PROJECT,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
    processes[name]=child;owned.append(child)
    report['processes'].append({'name':name,'module':module,'port':port,'pid':child.pid,'jarSha256':hashlib.sha256(jar.read_bytes()).hexdigest(),'startedAtEpochMs':int(time.time()*1000)})
    print('Started '+name+' pid='+str(child.pid),flush=True);save()
def stop(name):
    child=processes.get(name)
    if child and child.poll() is None:
        child.terminate()
        try:child.wait(timeout=10)
        except subprocess.TimeoutExpired:child.kill();child.wait(timeout=5)
        print('Stopped '+name,flush=True)
def app_rows(value):
    if not isinstance(value,dict):return []
    application=value.get('application',{})
    if not isinstance(application,dict):return []
    rows=application.get('instance',[])
    return rows if isinstance(rows,list) else [rows]
def full_rows(value):
    if not isinstance(value,dict):return []
    apps=value.get('applications',{}).get('application',[])
    if isinstance(apps,dict):apps=[apps]
    return [i for a in apps if a.get('name')=='LAB-PROVIDER' for i in app_rows({'application':a})]
def normalized(rows):
    return [{'appName':r.get('app'),'instanceId':r.get('instanceId'),'hostName':r.get('hostName'),'ipAddr':r.get('ipAddr'),'port':r.get('port',{}).get('$'),'status':r.get('status'),'vipAddress':r.get('vipAddress'),'lastRenewalTimestamp':r.get('leaseInfo',{}).get('lastRenewalTimestamp')} for r in rows]
def up_ports(rows):return {int(r['port']['$']) for r in rows if r.get('status')=='UP'}
def registries():
    result={}
    for port in [18761,18762]:
        byapp=safe(port,'/eureka/apps/LAB-PROVIDER');full=safe(port,'/eureka/apps');vip=safe(port,'/eureka/vips/lab-provider')
        result[str(port)]={'byApplication':byapp,'fullRegistry':full,'vipRegistry':vip,'peerDiagnostics':safe(port,'/lab/registry'),'normalized':normalized(app_rows(byapp.get('data')))}
    return result
def layers():
    entry={'atEpochMs':int(time.time()*1000),'providers':{str(p):safe(p,'/lab/identity') for p in [18811,18812]},'registries':registries(),'consumer':safe(18821,'/lab/discovery')}
    d=entry['consumer'].get('data',{})
    expected={18811,18812}
    checks={'providers':all(v.get('httpStatus')==200 and v['data'].get('fallback') is False for v in entry['providers'].values()),
            'registryByApplication':all(up_ports(app_rows(r['byApplication'].get('data')))==expected for r in entry['registries'].values()),
            'registryFull':all(up_ports(full_rows(r['fullRegistry'].get('data')))==expected for r in entry['registries'].values()),
            'springDiscovery':{r['port'] for r in d.get('springDiscovery',[])}==expected,
            'eurekaVip':{r['port'] for r in d.get('eurekaVip',[])}==expected,
            'ribbonAll':{r['port'] for r in d.get('ribbonAllServers',[])}==expected,
            'ribbonReachable':{r['port'] for r in d.get('ribbonReachableServers',[])}==expected}
    checks['registryIdentityDistinct']=all(len({r['instanceId'] for r in view['normalized']})==2 and all(r['appName']=='LAB-PROVIDER' and r['vipAddress']=='lab-provider' for r in view['normalized']) for view in entry['registries'].values())
    checks['peerSymmetric']=all(view['peerDiagnostics'].get('data',{}).get('peerMisclassifiedAsSelf') is False and bool(view['peerDiagnostics'].get('data',{}).get('activePeerUrls')) for view in entry['registries'].values())
    entry['checks']=checks;report['polls'].append(entry);save()
    return entry if all(checks.values()) else None
def sample():
    responses=[]
    report['tests']['feignRibbonGateway']={'pass':False,'responses':responses}
    for index in range(20):
        status,data=http(18800,'/api/lab/call')
        responses.append({'index':index+1,'status':status,**data});save();time.sleep(.15)
    counts={str(p):sum(r.get('port')==p for r in responses) for p in [18811,18812]}
    assert all(r['status']==200 and r.get('fallback') is False for r in responses)
    assert all(n>0 for n in counts.values()),'Ribbon did not use both providers'
    diagnostic=http(18821,'/lab/discovery')[1]
    assert {r['port'] for r in diagnostic['ribbonReachableServers']}=={18811,18812}
    report['tests']['feignRibbonGateway'].update({'pass':True,'instanceCounts':counts,'ruleClass':diagnostic['ruleClass'],'ribbonAfterSamples':diagnostic});save()
def circuit():
    status,values=http(18821,'/lab/circuit');assert status==200
    return next((r for r in values if r['command']=='LabClient#identity()'),None)
provider1={'EUREKA_CLIENT_SERVICEURL_DEFAULTZONE':'http://localhost:18761/eureka/'}
provider2={'EUREKA_CLIENT_SERVICEURL_DEFAULTZONE':'http://127.0.0.1:18762/eureka/'}
registry1={'REGISTRY_HOST':'localhost','PEER_URL':'http://127.0.0.1:18762/eureka/'}
registry2={'REGISTRY_HOST':'127.0.0.1','PEER_URL':'http://localhost:18761/eureka/'}
try:
    start('registry-1','eureka-server',18761,registry1);start('registry-2','eureka-server',18762,registry2)
    for p in [18761,18762]:wait_for('registry '+str(p),lambda p=p:http(p,'/eureka/apps')[0]==200)
    start('provider-1','provider-service',18811,provider1);start('provider-2','provider-service',18812,provider2)
    for p in [18811,18812]:wait_for('provider '+str(p),lambda p=p:http(p,'/lab/identity')[0]==200)
    wait_for('both registry application views',lambda:all(up_ports(app_rows(http(p,'/eureka/apps/LAB-PROVIDER')[1]))=={18811,18812} for p in [18761,18762]))
    report['tests']['registryBeforeConsumer']={'pass':True,'views':registries()};save()
    start('consumer','consumer-service',18821);start('gateway','gateway-service',18800)
    wait_for('consumer local diagnostic',lambda:http(18821,'/lab/discovery')[0]==200)
    # Require a stable interval longer than the original lease; no fixed sleep counts as success.
    stable={'since':None,'first':None}
    def stable_layers():
        observed=layers()
        if not observed:stable['since']=None;stable['first']=None;return None
        if stable['since'] is None:stable['since']=time.monotonic();stable['first']=observed
        return observed if time.monotonic()-stable['since']>=12 else None
    converged=wait_for('all discovery layers stable for 12 seconds',stable_layers)
    report['tests']['layeredDiscovery']={'pass':True,'firstPoll':report['polls'][0],'stableStart':stable['first'],'converged':converged,'stableSeconds':12,'pollCount':len(report['polls'])};save()
    assert http(18821,'/lab/stack')[1]['loadBalancerClass']=='org.springframework.cloud.netflix.ribbon.RibbonLoadBalancerClient'
    wait_for('gateway ready',lambda:http(18800,'/api/lab/call')[0]==200)
    sample()
    if args.mode=='full':
        # Actual failure then real open circuit: no force-open or mocked downstream.
        healthy=circuit();assert healthy and healthy['state']=='CLOSED'
        stop('provider-1');stop('provider-2')
        outage=[];report['tests']['hystrixOutage']={'pass':False,'healthy':healthy,'observations':outage}
        def fault():
            status,response=http(18800,'/api/lab/call');state=circuit()
            outage.append({'status':status,'response':response,'circuit':state});save()
            return state if state and state['open'] and state['totalFAILURE']+state['totalTIMEOUT']>0 else None
        opened=wait_for('actual failures open Hystrix',fault,60)
        before=opened['totalSHORT_CIRCUITED'];gate=opened['openedOrLastProbeAtEpochMs']
        status,fallback=http(18800,'/api/lab/call');assert status==200 and fallback['fallback'] is True
        shorted=wait_for('actual short-circuited metric',lambda:(lambda s:s if s['totalSHORT_CIRCUITED']>before else None)(circuit()),10)
        report['tests']['hystrixOutage'].update({'pass':True,'opened':opened,'shortCircuitState':shorted,'fallback':fallback});save()
        # Real providers recover with a small bounded delay, exposing the single probe in flight.
        start('provider-1','provider-service',18811,{**provider1,'LAB_IDENTITY_DELAY_MS':'600'})
        start('provider-2','provider-service',18812,{**provider2,'LAB_IDENTITY_DELAY_MS':'600'})
        wait_for('recovered providers and natural discovery refresh',layers)
        recovery=[];report['tests']['hystrixRecovery']={'pass':False,'observations':recovery,'halfOpenRepresentation':'Hystrix 1.5.18 has no HALF_OPEN enum: open=true + advanced probe gate + actual execution in flight.'}
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future=pool.submit(http,18800,'/api/lab/call')
            while not future.done():
                state=circuit();recovery.append(state);save();time.sleep(.05)
            status,response=future.result()
        assert status==200 and response['fallback'] is False
        assert any(s['state']=='OPEN_PROBE_IN_FLIGHT' and s['openedOrLastProbeAtEpochMs']>gate for s in recovery),'Actual single recovery probe not observed'
        closed=wait_for('successful probe closes circuit',lambda:(lambda s:s if not s['open'] else None)(circuit()),10)
        after=[http(18800,'/api/lab/call') for _ in range(4)]
        assert all(s==200 and r['fallback'] is False for s,r in after)
        report['tests']['hystrixRecovery'].update({'pass':True,'probeResponse':response,'closed':closed,'subsequentResponses':after});save()
        # Single registry failure while clients use their normal dual-registry configuration.
        stop('registry-1')
        surviving=safe(18762,'/eureka/apps/LAB-PROVIDER');assert surviving['httpStatus']==200
        failover=[http(18800,'/api/lab/call') for _ in range(6)]
        assert all(s==200 and r['fallback'] is False for s,r in failover)
        # A new provider process registers only with the surviving registry, proving fresh registration.
        stop('provider-1');start('provider-1','provider-service',18811,provider2)
        new_process_started=report['processes'][-1]['startedAtEpochMs']
        def fresh_registration():
            rows=app_rows(http(18762,'/eureka/apps/LAB-PROVIDER')[1])
            return rows if up_ports(rows)=={18811,18812} and any(r['instanceId']=='lab-provider:18811' and int(r.get('lastDirtyTimestamp',0))>=new_process_started for r in rows) else None
        fresh=wait_for('new process freshly registered with surviving registry',fresh_registration)
        wait_for('new process identity',lambda:http(18811,'/lab/identity')[0]==200)
        start('registry-1','eureka-server',18761,registry1)
        cluster=wait_for('restored registry and discovery converge',layers)
        report['tests']['eurekaNodeFailureRecovery']={'pass':True,'stoppedNode':18761,'survivingRegistry':surviving,'trafficWhileDown':failover,'freshProviderRegistrationToSurvivor':fresh,'freshProcessStartedAtEpochMs':new_process_started,'recoveredLayers':cluster,'scope':'Single-host processes, not physical-host/network partition HA'};save()
        status,item=http(18800,'/api/lab/items','POST',{'label':"P1 synthetic O'Hara ; --"});assert status==201
        itemid=item['id'];read=http(18800,f'/api/lab/items/{itemid}');assert read[1]['label']=="P1 synthetic O'Hara ; --"
        status,updated=http(18800,f'/api/lab/items/{itemid}','PATCH',{'label':'P1 persisted synthetic update'});assert status==200
        stop('provider-1');start('provider-1','provider-service',18811,provider1)
        persisted=wait_for('restarted provider reads stored row',lambda:(lambda r:r if r[0]==200 and r[1]['label']=='P1 persisted synthetic update' else None)(http(18811,f'/lab/items/{itemid}')))
        assert http(18812,f'/lab/items/{itemid}')[1]['label']==persisted[1]['label']
        wait_for('natural discovery after provider restart',layers)
        assert http(18800,f'/api/lab/items/{itemid}','DELETE')[0]==204
        assert http(18800,f'/api/lab/items/{itemid}')[0]==404
        assert http(18800,'/api/lab/items','POST',{'label':''})[0]==400
        report['tests']['mybatisHttpCrud']={'pass':True,'database':db['database'],'insertStatus':201,'insert':item,'read':read,'update':updated,'restartRead':persisted,'otherInstanceRead':True,'deleteStatus':204,'missingStatus':404,'invalidStatus':400};save()
        route=http(18800,'/api/lab/identity');assert route[0]==200 and not route[1]['fallback']
        assert http(18800,'/api/lab/circuit')[0]==200
        assert http(18800,'/api/lab/discovery')[0]==404, 'Diagnostics accidentally exposed through Gateway'
        report['tests']['gatewayRoutes']={'pass':True,'providerRoute':route,'consumerRoute':'/api/lab/call','circuitRoute':'/api/lab/circuit','diagnosticExcluded':True};save()
    report['overall']='pass';save();print('P1 '+args.mode+' checks passed',flush=True)
except Exception as error:
    report['overall']='failed';report['failures'].append({'type':type(error).__name__,'message':str(error)})
    report['finalDiagnostic']=safe(18821,'/lab/discovery');save();print(traceback.format_exc(),flush=True);raise
finally:
    for name in list(processes):stop(name)
    for stream in logs:stream.close()
    report['allOwnedProcessesStopped']=all(p.poll() is not None for p in owned)
    report['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();save()
    (ROOT/'docs/p1-evidence/latest-resume.json').write_text(json.dumps({'directory':EVIDENCE.relative_to(ROOT).as_posix(),'overall':report.get('overall')},indent=2)+'\n',encoding='utf8')
    print('Evidence: '+str(EVIDENCE),flush=True)
