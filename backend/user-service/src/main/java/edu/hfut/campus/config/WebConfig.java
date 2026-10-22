package edu.hfut.campus.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import edu.hfut.campus.security.Authentication;
@Configuration public class WebConfig implements WebMvcConfigurer  {
  private final Authentication auth;
  public WebConfig(Authentication a)  {
    auth=a;
  }
  public void addInterceptors(InterceptorRegistry r)  {
    r.addInterceptor(auth).addPathPatterns("/**");
  }
}
