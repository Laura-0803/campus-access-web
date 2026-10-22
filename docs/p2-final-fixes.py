"""Small, explicit contract fixes. UTF-8 source avoids shell code-page conversions."""
from pathlib import Path
R=Path(__file__).resolve().parents[1];J=R/'backend/user-service/src/main/java/edu/hfut/campus'
p=J/'service/impl/AdminServiceImpl.java';s=p.read_text(encoding='utf-8')
s=s.replace('throw new ApiException(400,"请填写"+field)', 'throw new ApiException(400,"请填写"+fieldLabel(field))')
s=s.replace('names[i]+"不能超过 "', 'fieldLabel(names[i])+"不能超过 "')
s=s.replace('throw new ApiException(400,"毕业年份不正确")','throw new ApiException(400,"毕业年份需在 1950-"+Year.now().getValue()+" 年之间")')
s=s.replace('if(!p.code.matches(regex))throw new ApiException(400,"人员编号格式不正确");','if(!p.code.matches(regex)){String codeLabel="学生".equals(type)?"学号/编号":"访客".equals(type)?"访客编号":"校友".equals(type)?"校友编号":"工号/编号",hint="学生".equals(type)?"6-20 位数字学号":"访客".equals(type)?"VIS 开头，7-24 位大写字母/数字/短横线":"校友".equals(type)?"4-24 位大写字母/数字/短横线":"4-20 位大写字母/数字/短横线";throw new ApiException(400,codeLabel+"格式不正确："+hint);}')
s=s.replace('LocalDate.of(Integer.parseInt(p.idNumber.substring(6,10)),', 'if(Integer.parseInt(p.idNumber.substring(6,10))<100)throw new IllegalArgumentException();LocalDate.of(Integer.parseInt(p.idNumber.substring(6,10)),')
p.write_text(s,encoding='utf-8')
p=J/'service/impl/AuthServiceImpl.java';s=p.read_text(encoding='utf-8').replace('audit(u,"注册访客账号");','auditRegistration(u,p);')
if 'private void auditRegistration' not in s:
 s=s.replace(' private void audit(', ' private void auditRegistration(UserEntity u,PersonEntity p){d.audit(map("id","L"+UUID.randomUUID(),"time",LocalDateTime.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),"actor",p.name,"role","访客","action","注册访客账号","target",p.phone));}\n private void audit(')
p.write_text(s,encoding='utf-8')
# New isolated schemas widen only the internal ordering column; original tables are never altered.
p=R/'backend/user-service/src/main/resources/db/migration/V001__user_schema.sql';s=p.read_text(encoding='utf-8').replace('sort_order INT','sort_order BIGINT');p.write_text(s,encoding='utf-8')
for p in (R/'backend/user-service/src/main/resources/mapper').glob('*.xml'):
 s=p.read_text(encoding='utf-8').replace('-UNIX_TIMESTAMP()', '-CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(6))*1000000 AS SIGNED)');p.write_text(s,encoding='utf-8')
print('Contract validation, audit actor and stable internal order updates applied')
