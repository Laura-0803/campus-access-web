"""Read-only source/Git inventory. Never imports the legacy store or opens MySQL."""
from pathlib import Path
import csv, hashlib, json, subprocess
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'p2-evidence'
OUT.mkdir(exist_ok=True)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args):
    p = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, encoding='utf-8')
    return {'exitCode': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr}

original = list(csv.DictReader((ROOT/'docs/original-file-hashes.csv').open(encoding='utf-8-sig')))
checks = [{'file': r['file'], 'unchanged': sha(ROOT/'campus-access-web'/r['file']) == r['sha256']} for r in original]
inventory = list(csv.DictReader((ROOT/'docs/api-inventory.csv').open(encoding='utf-8-sig')))
user = [r for r in inventory if r['target_service'].startswith('user-service')]
aggregate = [r for r in user if r['path'].startswith(('/api/dashboard/', '/api/reports/'))]
core = [r for r in user if r not in aggregate]
tracked = git('ls-files')['stdout'].splitlines()
danger = [p for p in tracked if any(x in p.lower() for x in ['.private-backups', '.p1-local', '.p2-local', 'database-snapshot', '.env']) and not p.endswith('.env.example')]
probes = ['.private-backups.zip', '.private-backups (2).zip', '.p1-local.zip', '.private-backups/', '.p1-local/', '.p2-local/', '.env', 'database-snapshot.json']
report = {'timeUtc': datetime.now(timezone.utc).isoformat(), 'originalSourceChecks': checks,
          'originalSourceUnchanged': all(c['unchanged'] for c in checks),
          'apiInventoryCount': len(inventory), 'userOwnedCount': len(user),
          'proposedP2Count': len(core), 'legacyAggregateCount': len(aggregate),
          'trackedFiles': tracked, 'trackedSensitiveFiles': danger,
          'gitStatus': git('status', '--short'), 'gitIgnore': git('check-ignore', '-v', '--', *probes),
          'actionsByThisScript': {'businessServicesStarted': False, 'businessDatabaseWrites': 0,
          'buildRun': False, 'runtimeTestsRun': False}}
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
evidence=OUT/('preflight-'+stamp+'.json')
evidence.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
controllers = {'auth': 'AuthController', 'roles': 'RoleController', 'profiles': 'ProfileController', 'people': 'PersonAdminController', 'users': 'UserAdminController', 'faces': 'FaceController', 'vehicles': 'VehicleController', 'messages': 'MessageController', 'logs': 'AuditController'}
lines = ['# P2 API 迁移清单（实施前，未迁移）', '',
         f'P0共{len(inventory)}条；user-service归属{len(user)}条。建议本阶段覆盖{len(core)}条用户域接口，另外{len(aggregate)}条跨域聚合暂保留Express。下表只是拟定映射，Java类和方法均未创建，不能视为实现或测试通过。', '',
         '|编号|原接口|Express来源|拟定Java方法|当前状态|', '|---|---|---|---|---|']
for r in core:
    category=r['path'].split('/')[2]
    method = r['frontend_method'] if r['frontend_method'] != '无前端封装' else r['id'].replace('-', '').lower()
    lines.append(f"|{r['id']}|{r['method']} `{r['path']}`|{r['backend_source']}|{controllers[category]}.{method}|未实现/未编译/未运行/未测试|")
lines += ['', '暂保留原实现的聚合接口：', ''] + [f"- {r['id']} {r['method']} `{r['path']}`" for r in aggregate]
lines += ['', '迁移须逐项比较请求、状态码、JSON字段和省略/null/空串、数组及顶层total、排序、六角色及非法参数。未迁移API仍需通过同一登录会话的集成回归；当前未执行这些HTTP测试。', '', '认证差异与待批准方案见 [认证兼容性问题](p2-auth-compatibility.md)。']
candidate=(OUT/('preflight-api-candidates-'+stamp+'.md')) if (ROOT/'backend').exists() else ROOT/'docs/p2-api-migration.md'
candidate.write_text('\n'.join(lines)+'\n', encoding='utf-8')
print(json.dumps({'originalFiles':len(checks), 'unchanged':report['originalSourceUnchanged'], 'trackedSensitive':danger, 'proposedP2Apis':len(core), 'aggregateApis':len(aggregate)}, ensure_ascii=False))
if not report['originalSourceUnchanged'] or danger or report['gitIgnore']['exitCode']:
    raise SystemExit(1)
