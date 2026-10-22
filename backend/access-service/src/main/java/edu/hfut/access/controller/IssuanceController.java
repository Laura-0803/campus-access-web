package edu.hfut.access.controller;import java.util.*;import org.springframework.web.bind.annotation.*;import org.springframework.beans.factory.annotation.Value;import edu.hfut.access.service.impl.IssuanceService;import edu.hfut.access.dao.IssuanceMapper;
@RestController @RequestMapping("/internal/issuance")public class IssuanceController{
 private final IssuanceService s;private final IssuanceMapper dao;@Value("${P4_FAULT_INJECTION:false}")boolean faults;
 public IssuanceController(IssuanceService s,IssuanceMapper d){this.s=s;dao=d;}
 private void after(String phase){if(faults&&dao.consume("delay-after-"+phase)>0)try{Thread.sleep(4000);}catch(InterruptedException e){Thread.currentThread().interrupt();}}
 @GetMapping("/{id}")public Object result(@PathVariable String id){return s.result(id);}
 @PostMapping("/prepare")public Object prepare(@RequestHeader("Authorization")String token,@RequestBody Map<String,Object>b){Object r=s.prepare(token,b);after("prepare");return r;}
 @PostMapping("/activate")public Object activate(@RequestBody Map<String,Object>b){Object r=s.activate(b);after("activate");return r;}
}
