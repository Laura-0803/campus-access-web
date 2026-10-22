"""Read-only collection after the failed live run. Does not start or change services."""
from pathlib import Path
import json,re,hashlib,csv,subprocess
root=Path(__file__).resolve().parent.parent
private=root/'.p1-local';out=root/'docs/p1-evidence'
logs={name:(private/(name+'.log')).read_text(encoding='utf8',errors='replace') for name in ['registry-1','registry-2','provider-1','provider-2','consumer','gateway']}
consumer=logs['consumer']
responses=re.findall(r'Writing \[\{[^\n]*?instance=(\d+)[^\n]*?\}\]',consumer)
counts={p:responses.count(p) for p in sorted(set(responses))}
initialLists=[line for line in consumer.splitlines() if 'current list of Servers=[' in line]
startup={name:[line for line in text.splitlines() if ('Started ' in line and 'Application' in line) or 'Tomcat started on port(s)' in line or 'Netty started on port' in line] for name,text in logs.items()}
errors={name:[line for line in text.splitlines() if ' ERROR ' in line] for name,text in logs.items()}
gatewayRoute=[line for line in logs['gateway'].splitlines() if any(x in line for x in ['Route matched: lab-consumer','Mapping [Exchange: GET http://127.0.0.1:18800/api/lab/call','Completed 200 OK'])]
analysis={'assertion':'Ribbon did not use both providers','observedConsumerResponseInstanceCountsIncludingReadinessProbe':counts,'ribbonServerListLogLines':initialLists,'startupEvidence':startup,'componentErrorLogLines':errors,'gatewayRouteEvidence':gatewayRoute,'diagnosis':'Both provider JVMs started and both registry APIs listed both instances. Ribbon initial server list contained only 18812, and all observed Feign responses used 18812. Consumer discovery/cache/lease convergence is a hypothesis, not yet proven root cause. No version incompatibility has been established.','nextStepsRequiringConfirmation':['Expose consumer DiscoveryClient/Ribbon visible instance lists and compare with both registry full and per-app APIs.','Wait for both instances in the consumer and Ribbon list before load sampling; investigate lease/cache settings without changing versions.','Rerun P1 balance, then perform actual provider outage/circuit/fallback/recovery and HTTP CRUD.'],'relatedRuntimeTestsPaused':True,'noAlternativeComponentsSubstituted':True}
(out/'ribbon-failure-analysis.json').write_text(json.dumps(analysis,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
lines=['Actual P1 startup and failed Ribbon sampling excerpts. No rerun has been performed.','']
for name,values in startup.items():lines+=['## '+name]+values+['']
lines+=['## Consumer Ribbon server list']+initialLists+['','## Actual response instance counts (includes readiness probe)',json.dumps(counts),'','## Gateway route matching']+gatewayRoute
(out/'startup-and-routing.txt').write_text('\n'.join(lines)+'\n',encoding='utf8')
jdk=json.loads((private/'jdk.json').read_text(encoding='utf-8-sig'))
(out/'isolated-jdk.json').write_text(json.dumps(jdk,indent=2)+'\n',encoding='utf8')
baseline=list(csv.DictReader((root/'docs/original-file-hashes.csv').open(encoding='utf-8-sig')))
changed=[r['file'] for r in baseline if hashlib.sha256((root/'campus-access-web'/r['file']).read_bytes()).hexdigest()!=r['sha256']]
gitroot=subprocess.check_output(['git','rev-parse','--show-toplevel'],cwd=root,text=True,encoding='utf8').strip()
tracked=subprocess.check_output(['git','ls-files'],cwd=root,text=True,encoding='utf8').splitlines()
commit=subprocess.check_output(['git','log','-1','--format=%h %s'],cwd=root,text=True,encoding='utf8').strip()
git={'repositoryRoot':gitroot,'newInitialCommit':commit,'trackedFiles':tracked,'pastHistoryRestored':False,'p0ApplicationFilesCompared':len(baseline),'changedOriginalFiles':changed}
(out/'git-and-source-check.json').write_text(json.dumps(git,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
assert not changed and tracked==['.gitignore']
print(json.dumps({'responseInstanceCounts':counts,'originalFilesUnchanged':len(baseline),'newInitialCommit':commit,'paused':True}))
