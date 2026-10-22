from pathlib import Path
import re
R=Path(__file__).resolve().parents[1];s=(R/'campus-access-web/server/db/schema.sql').read_text(encoding='utf-8');out=[]
for table in ['qr_codes','access_records','devices','gates','access_rules','settings']:
 m=re.search(r'CREATE TABLE IF NOT EXISTS '+table+r'\s*\([\s\S]*?;',s,re.I)
 if not m:raise SystemExit('Missing actual source DDL: '+table)
 sql=m.group().replace('sort_order INT','sort_order BIGINT')
 if table=='qr_codes':sql=sql.replace('sort_order BIGINT','UNIQUE KEY uq_appointment(appointment_id),\n  sort_order BIGINT')
 out.append(sql)
out.append('''CREATE TABLE IF NOT EXISTS access_requests(request_id VARCHAR(128) PRIMARY KEY,request_digest VARCHAR(64) NOT NULL,response_json MEDIUMTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;''')
out.append('''CREATE TABLE IF NOT EXISTS access_outbox(event_id VARCHAR(128) PRIMARY KEY,kind VARCHAR(32) NOT NULL,payload MEDIUMTEXT NOT NULL,state VARCHAR(24) NOT NULL,attempts INT NOT NULL DEFAULT 0,next_retry_at DATETIME(3),last_error_code VARCHAR(64),KEY ix_pending(state,next_retry_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;''')
p=R/'backend/access-service/src/main/resources/db/migration/V001__access_schema.sql';p.parent.mkdir(parents=True,exist_ok=True);p.write_text('\n\n'.join(out),encoding='utf-8');print('Extracted six actual original table DDLs; added isolated idempotency/outbox constraints')
