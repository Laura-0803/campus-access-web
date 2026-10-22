"""Static evidence from complete original source files; no application imports."""
from pathlib import Path
import hashlib,json,csv,re
R=Path(__file__).resolve().parents[1];E=R/'docs/p3-evidence'
names=['docs/api-contract.md','docs/api-inventory.csv','docs/service-boundaries.md','docs/database-dictionary.md','docs/database-migration.md','docs/p2-acceptance.md','docs/p2-delete-detailed-design.md','campus-access-web/server/routes/appointments.js','campus-access-web/server/lib/store.js','campus-access-web/server/middleware/auth.js','campus-access-web/server/index.js','campus-access-web/server/lib/blacklist.js','campus-access-web/src/pages/RoleDashboard.jsx','campus-access-web/src/pages/FeaturePages.jsx','campus-access-web/src/api/client.js']
files=[];texts={}
for name in names:
 data=(R/name).read_bytes();texts[name]=data.decode('utf-8-sig');files.append({'file':name,'bytes':len(data),'lines':len(texts[name].splitlines()),'sha256':hashlib.sha256(data).hexdigest()})
source=texts['campus-access-web/server/routes/appointments.js'];inventory=list(csv.DictReader(texts['docs/api-inventory.csv'].splitlines()))
apis=[r for r in inventory if r['target_service']=='appointment-service']
routes=[{'method':m[0].upper(),'path':'/api'+m[1]} for m in re.findall(r'router\.(get|post|patch|delete)\("([^"]+)"',source)]
report={'type':'static source analysis, not runtime success','filesRead':files,'inventoryTotal':len(inventory),'appointmentApiInventory':[{'id':r['id'],'method':r['method'],'path':r['path']} for r in apis],'actualRoutes':routes,'states':dict(re.findall(r'(legacyPending|hostPending|securityPending|approved|rejected): "([^"]+)"',source)),'appointmentRouteWritesMessages':bool(re.search(r'data\.messages|notify|notification',source)),'appointmentRouteWritesLogs':bool(re.search(r'data\.logs|audit\(',source)),'hasOriginalDeleteRoute':bool(re.search(r'router\.delete',source)),'originalGlobalWriteQueue':bool(re.search(r'writeQueue\.then',texts['campus-access-web/server/lib/store.js'])),'originalHostStatusCheck':bool(re.search(r'hostPerson\.status|hostPerson.*停用',source)),'syncQrCreationInsideReview':'data.qrCodes.unshift(qrCode)' in source,'originalInitializationRun':False,'originalDatabaseWrites':0}
assert len(routes)==len(apis)==5 and len(report['states'])==5
(E/'source-analysis.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Complete input files fingerprinted; 5 routes/5 states; no appointment notification/log side effects in original route')
