package edu.hfut.access.security;import java.util.*;import javax.servlet.http.HttpServletRequest;import edu.hfut.access.dto.Context;import edu.hfut.access.exception.ApiException;
public final class Identity{
 public static String token(HttpServletRequest r){String h=r.getHeader("Authorization");return h!=null&&h.toLowerCase(Locale.ROOT).startsWith("bearer ")?h.substring(7).trim():r.getHeader("x-campus-token");}
 public static String text(Map<String,?>m,String k){return m==null||m.get(k)==null?"":String.valueOf(m.get(k));}
 public static void require(Context c,String...roles){if(!Arrays.asList(roles).contains(text(c.actor,"role")))throw new ApiException(403,"当前角色无权访问该接口");}
}
