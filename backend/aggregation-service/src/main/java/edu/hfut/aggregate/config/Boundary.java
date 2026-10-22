package edu.hfut.aggregate.config;
import javax.servlet.http.*;import org.springframework.stereotype.Component;import org.springframework.web.servlet.*;import org.springframework.web.servlet.config.annotation.*;import org.springframework.beans.factory.annotation.Value;import java.security.MessageDigest;import java.nio.charset.StandardCharsets;import edu.hfut.aggregate.exception.ApiException;
@Component public class Boundary implements WebMvcConfigurer{
 @Value("${P2_INTERNAL_KEY}")String key;
 public void addInterceptors(InterceptorRegistry r){r.addInterceptor(new HandlerInterceptor(){public boolean preHandle(HttpServletRequest q,HttpServletResponse s,Object h){s.setHeader("Cache-Control","no-store");s.setHeader("X-P6-Service","aggregation-service");if(q.getRequestURI().startsWith("/internal/")){String k=q.getHeader("X-Campus-Internal");if(k==null||!MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),k.getBytes(StandardCharsets.UTF_8)))throw new ApiException(403,"内部接口禁止访问");}return true;}});}
}
