package edu.hfut.campus.security;
import edu.hfut.campus.dao.*;
import edu.hfut.campus.entity.*;
import edu.hfut.campus.exception.*;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;
@Service public class SessionAuthority  {
  private final UserMapper dao;
  public SessionAuthority(UserMapper d)  {
    dao=d;
  }
  public UserEntity resolve(String token)  {
    if(token==null||token.isEmpty())throw new ApiException(401,"请先登录后再访问系统接口");
    SessionEntity s=dao.session(Passwords.digest(token));
    boolean valid=false;
    try  {
      valid=s!=null&&Instant.parse(s.expiresAt).isAfter(Instant.now());
    }
    catch(Exception ignored)  {
    }
    if(!valid)throw new ApiException(401,"登录状态已失效，请重新登录");
    UserEntity u=dao.user(s.userId);
    if(u==null)throw new ApiException(401,"登录账号不存在，请重新登录");
    if(!"启用".equals(u.status))throw new ApiException(403,"账号已被停用");
    return u;
  }
}
