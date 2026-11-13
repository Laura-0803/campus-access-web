package edu.hfut.campus.lab;

import java.util.Map;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
@FeignClient(name="lab-provider",fallbackFactory=LabFallbackFactory.class)
public interface LabClient { @GetMapping("/lab/identity") Map<String,Object> identity(); }
