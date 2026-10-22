package edu.hfut.campus.lab;

import java.util.Map;
import feign.hystrix.FallbackFactory;
import org.springframework.stereotype.Component;
@Component
public class LabFallbackFactory implements FallbackFactory<LabClient> {
 public LabClient create(Throwable cause){return ()->Map.of("service","lab-provider","fallback",true,"reason",cause.getClass().getSimpleName());}
}
