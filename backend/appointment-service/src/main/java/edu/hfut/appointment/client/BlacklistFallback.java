package edu.hfut.appointment.client;
import org.springframework.stereotype.Component;
import feign.hystrix.FallbackFactory;
@Component public class BlacklistFallback implements FallbackFactory<BlacklistClient>{
 public BlacklistClient create(Throwable cause){return (key,body)->new BlacklistClient.Result();}
}
