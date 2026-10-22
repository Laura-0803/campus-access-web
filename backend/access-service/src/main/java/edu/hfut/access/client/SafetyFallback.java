package edu.hfut.access.client;import java.util.*;import org.springframework.stereotype.Component;import feign.hystrix.FallbackFactory;
@Component public class SafetyFallback implements FallbackFactory<SafetyClient>{public SafetyClient create(Throwable t){return(k,b)->Collections.singletonMap("available",false);}}
