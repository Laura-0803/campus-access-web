"""Use table-specific entities for roles, profiles, sessions and OTP reads."""
from pathlib import Path
import re
R=Path(__file__).resolve().parents[1];J=R/'backend/user-service/src/main/java/edu/hfut/campus'
p=J/'dao/UserMapper.java';s=p.read_text(encoding='utf-8').replace('List<Map<String,Object>> roles()', 'List<RoleEntity> roles()').replace('List<Map<String,Object>> profiles()', 'List<RoleProfileEntity> profiles()').replace('Map<String,Object> session(', 'SessionEntity session(').replace('Map<String,Object> code(', 'VerificationCodeEntity code(');p.write_text(s,encoding='utf-8')
p=R/'backend/user-service/src/main/resources/mapper/UserMapper.xml';s=p.read_text(encoding='utf-8')
for name,cls in [('roles','RoleEntity'),('profiles','RoleProfileEntity'),('session','SessionEntity'),('code','VerificationCodeEntity')]:s=s.replace('id="'+name+'" resultType="map"','id="'+name+'" resultType="edu.hfut.campus.entity.'+cls+'"')
s=s.replace('SELECT user_id AS userId,expires_at AS expiresAt FROM sessions', 'SELECT token,user_id AS userId,role,created_at AS createdAt,expires_at AS expiresAt FROM sessions');p.write_text(s,encoding='utf-8')
p=J/'security/SessionAuthority.java';s=p.read_text(encoding='utf-8').replace('Map<String,Object>s=dao.session','SessionEntity s=dao.session').replace('(String)s.get("expiresAt")','s.expiresAt').replace('(String)s.get("userId")','s.userId');p.write_text(s,encoding='utf-8')
p=J/'service/impl/AuthServiceImpl.java';s=p.read_text(encoding='utf-8')
s=s.replace('for(Map<String,Object>r:d.roles())if(role.equals(r.get("roleKey")))return (String)r.get("label");','for(RoleEntity r:d.roles())if(role.equals(r.roleKey))return r.label;')
s=s.replace('for(Map<String,Object>r:d.roles())roles.put((String)r.get("roleKey"),r.get("label"));','for(RoleEntity r:d.roles())roles.put(r.roleKey,r.label);')
s=re.sub(r'for\(Map<String,Object>r:d.profiles\(\)\)\s*\{\s*Map<String,Object>p=new LinkedHashMap<>\(r\);\s*String k=\(String\)p.remove\("roleKey"\);\s*profiles.put\(k,p\);\s*\}', 'for(RoleProfileEntity r:d.profiles())profiles.put(r.roleKey,profileMap(r));',s)
s=s.replace('for(Map<String,Object>r:d.profiles())if(u.role.equals(r.get("roleKey")))base.putAll(r);','for(RoleProfileEntity r:d.profiles())if(u.role.equals(r.roleKey))base.putAll(profileMap(r));')
s=s.replace('Map<String,Object>old=d.code','VerificationCodeEntity old=d.code').replace('Map<String,Object>c=d.code','VerificationCodeEntity c=d.code').replace('Map<String,Object>c=verify','VerificationCodeEntity c=verify').replace('private Map<String,Object> verify(', 'private VerificationCodeEntity verify(')
s=s.replace('((Number)old.get("sentAt")).longValue()', 'old.sentAt').replace('((Number)c.get("expiresAt")).longValue()', 'c.expiresAt').replace('((Number)c.get("attempts")).intValue()', 'c.attempts').replace('c.get("digest")','c.digest').replace('c.get("userId")','c.userId')
s=s.replace('"user",u,', '"user",new edu.hfut.campus.dto.SafeUser(u),')
s=s.replace('return t;', 'return new edu.hfut.campus.dto.SafeUser(t);').replace('return u;','return new edu.hfut.campus.dto.SafeUser(u);')
# resetTarget is internal and must still return the entity for transactional validation.
s=s.replace('if(p==null||!phone.equals(p.phone))throw new ApiException(400,"账号与绑定手机号不匹配");\n    return new edu.hfut.campus.dto.SafeUser(u);', 'if(p==null||!phone.equals(p.phone))throw new ApiException(400,"账号与绑定手机号不匹配");\n    return u;')
p.write_text(s,encoding='utf-8')
p=J/'service/impl/ProfileServiceImpl.java';s=p.read_text(encoding='utf-8').replace('for(Map<String,Object>r:d.profiles())if(u.role.equals(r.get("roleKey")))base.putAll(r);','for(RoleProfileEntity r:d.profiles())if(u.role.equals(r.roleKey))base.putAll(profileMap(r));').replace('"user",u,','"user",new edu.hfut.campus.dto.SafeUser(u),');p.write_text(s,encoding='utf-8')
p=J/'service/impl/CredentialServiceImpl.java';s=p.read_text(encoding='utf-8').replace('for(Map<String,Object>p:d.profiles())if(role.equals(p.get("roleKey")))return (String)p.get("personId");','for(RoleProfileEntity p:d.profiles())if(role.equals(p.roleKey))return p.personId;');p.write_text(s,encoding='utf-8')
p=J/'service/impl/AdminServiceImpl.java';s=p.read_text(encoding='utf-8').replace('List<UserEntity>out=new ArrayList<>();','List<edu.hfut.campus.dto.SafeUser>out=new ArrayList<>();').replace('out.add(u);','out.add(new edu.hfut.campus.dto.SafeUser(u));').replace('return u;', 'return new edu.hfut.campus.dto.SafeUser(u);');p.write_text(s,encoding='utf-8')
print('Table-specific mapper entities and safe user DTOs are active')
