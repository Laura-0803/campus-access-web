from pathlib import Path
R=Path(__file__).resolve().parents[1];J=R/'backend/user-service/src/main/java/edu/hfut/campus'
p=J/'service/impl/AuthServiceImpl.java';s=p.read_text(encoding='utf-8').replace('UUID.randomUUID().toString().replace("-","").substring(0,20)', 'UUID.randomUUID().toString().replace("-","").substring(0,20).toUpperCase(Locale.ROOT)');p.write_text(s,encoding='utf-8')
p=J/'service/impl/AdminServiceImpl.java';s=p.read_text(encoding='utf-8').replace('m.createPerson(p);','p.faceStatus=null;\n      m.createPerson(p);').replace('return p;','return create?new edu.hfut.campus.dto.PersonCreated(p):p;');p.write_text(s,encoding='utf-8')
p=R/'docs/p2-schema-verify.mjs';s=p.read_text(encoding='utf-8')
old="await c.query('CREATE TABLE IF NOT EXISTS `'+cfg.legacy+'`.user_domain_outbox(id VARCHAR(64) PRIMARY KEY,payload JSON NOT NULL,state VARCHAR(16) NOT NULL,INDEX ix_outbox_state(state)) ENGINE=InnoDB');"
new="await c.query(fs.readFileSync('backend/legacy-adapter/schema.sql','utf8').replace('CREATE TABLE IF NOT EXISTS user_domain_outbox','CREATE TABLE IF NOT EXISTS `'+cfg.legacy+'`.user_domain_outbox'));"
s=s.replace(old,new);p.write_text(s,encoding='utf-8')
print('Final creation DTO and adapter schema source verified')
