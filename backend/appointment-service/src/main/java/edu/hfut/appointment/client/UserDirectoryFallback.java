package edu.hfut.appointment.client;
import feign.hystrix.FallbackFactory;
import org.springframework.stereotype.Component;
import edu.hfut.appointment.dto.DirectoryContext;
@Component public class UserDirectoryFallback implements FallbackFactory<UserDirectory> {
 public UserDirectory create(Throwable cause){return new UserDirectory(){
  public DirectoryContext context(String key,String token,String visitorId){DirectoryContext d=new DirectoryContext();d.unavailable=true;return d;}
  public edu.hfut.appointment.dto.WriteContext resolve(String key,String token,java.util.Map<String,Object> body){edu.hfut.appointment.dto.WriteContext d=new edu.hfut.appointment.dto.WriteContext();d.unavailable=true;return d;}
 };}
}
