package edu.hfut.access.client;
import org.springframework.context.annotation.Bean;
import feign.codec.ErrorDecoder;
import feign.FeignException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.netflix.hystrix.exception.HystrixBadRequestException;
import edu.hfut.access.exception.ApiException;
/** Invalid credentials are business denials, never counted as infrastructure failures. */
public class DirectoryFeignConfig {
 @Bean public ErrorDecoder identityErrors(){return (method,response)->{
  if(response.status()>=400&&response.status()<500){String message="身份验证被拒绝";try{message=new ObjectMapper().readTree(response.body().asInputStream()).path("error").path("message").asText(message);}catch(Exception ignored){}return new HystrixBadRequestException("Identity rejected",new ApiException(response.status(),message));}
  return FeignException.errorStatus(method,response);
 };}
}
