package edu.hfut.appointment.client;
import org.springframework.stereotype.Component;
import feign.hystrix.FallbackFactory;
@Component public class AuditFallback implements FallbackFactory<AuditClient>{public AuditClient create(Throwable cause){return (key,body)->new AuditClient.Receipt();}}
