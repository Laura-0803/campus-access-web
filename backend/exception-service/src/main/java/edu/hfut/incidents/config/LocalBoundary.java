package edu.hfut.incidents.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.beans.factory.annotation.Value;
import javax.annotation.PostConstruct;
import javax.servlet.http.*;
import javax.sql.DataSource;
import java.sql.*;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import edu.hfut.incidents.exception.ApiException;
@Configuration public class LocalBoundary implements WebMvcConfigurer {
 @Value("${P4_INTERNAL_KEY}")private String key;@Value("${spring.datasource.url}")private String url;@Value("${server.address}")private String address;
 private final DataSource ds;public LocalBoundary(DataSource ds){this.ds=ds;}
 @PostConstruct public void verify()throws Exception{
  if(!"127.0.0.1".equals(address)||key.length()<32||!url.matches("jdbc:mysql://127\\.0\\.0\\.1:[0-9]+/campus_p4c_exception_[0-9]{14}\\?.*"))throw new IllegalStateException("P4 isolated loopback configuration required");
  try(Connection c=ds.getConnection();Statement s=c.createStatement();ResultSet r=s.executeQuery("SHOW GRANTS")){String db=c.getCatalog();if(!db.matches("campus_p4c_exception_[0-9]{14}"))throw new IllegalStateException("P4 schema required");while(r.next()){String g=r.getString(1);if(!g.startsWith("GRANT USAGE")&&(!g.contains(" ON `"+db+"`.*")||g.matches(".*\\b(ALL PRIVILEGES|CREATE|ALTER|DROP|GRANT OPTION)\\b.*")))throw new IllegalStateException("P4 account privileges too broad");}}
 }
 public void addInterceptors(InterceptorRegistry registry){registry.addInterceptor(new HandlerInterceptor(){public boolean preHandle(HttpServletRequest r,HttpServletResponse s,Object h){s.setHeader("Cache-Control","no-store");s.setHeader("X-P4C-Service","exception-service");if(r.getRequestURI().startsWith("/internal/")){String k=r.getHeader("X-Campus-Internal");if(k==null||!MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),k.getBytes(StandardCharsets.UTF_8)))throw new ApiException(403,"内部接口禁止访问");}return true;}});}
}
