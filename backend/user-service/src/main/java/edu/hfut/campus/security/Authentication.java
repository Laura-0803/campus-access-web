package edu.hfut.campus.security;
import javax.servlet.http.*;
import org.springframework.web.servlet.*;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import edu.hfut.campus.exception.*;
import java.security.*;
import java.nio.charset.StandardCharsets;
@Component public class Authentication implements HandlerInterceptor  {
  private final SessionAuthority auth;
  @Value("${P2_INTERNAL_KEY}")String key;
  public Authentication(SessionAuthority a)  {
    auth=a;
  }
  public static String token(HttpServletRequest r)  {
    String h=r.getHeader("Authorization");
    return h!=null&&h.toLowerCase().startsWith("bearer ")?h.substring(7).trim():r.getHeader("x-campus-token");
  }
  public boolean preHandle(HttpServletRequest r,HttpServletResponse s,Object h)  {
    s.setHeader("Cache-Control","no-store");
    String p=r.getRequestURI();
    if(p.startsWith("/internal/"))  {
      String k=r.getHeader("X-Campus-Internal");
      if(k==null||!MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),k.getBytes(StandardCharsets.UTF_8)))throw new ApiException(403,"内部接口禁止访问");
      return true;
    }
    if(p.equals("/api/roles")&&r.getMethod().equals("GET")||r.getMethod().equals("POST")&&java.util.Arrays.asList("/api/auth/login","/api/auth/send-code","/api/auth/reset-code","/api/auth/reset-password","/api/auth/register-visitor").contains(p))return true;
    r.setAttribute("identity",auth.resolve(token(r)));
    return true;
  }
}
