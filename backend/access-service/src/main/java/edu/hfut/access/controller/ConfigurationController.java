package edu.hfut.access.controller;import java.util.*;import javax.servlet.http.HttpServletRequest;import org.springframework.web.bind.annotation.*;import org.springframework.http.ResponseEntity;import edu.hfut.access.service.AccessOperations;import edu.hfut.access.dto.Envelope;import static edu.hfut.access.security.Identity.token;
@RestController @RequestMapping("/api")public class ConfigurationController{
 private final AccessOperations s;public ConfigurationController(AccessOperations s){this.s=s;}
 @GetMapping("/devices")public Object devices(HttpServletRequest r,@RequestParam Map<String,String>q){return s.list(token(r),"devices",q);}
 @PostMapping("/devices")public Object device(HttpServletRequest r,@RequestBody Map<String,Object>b){return ResponseEntity.status(201).body(Envelope.ok(s.create(token(r),"devices",b)));}
 @PatchMapping("/devices/{id}")public Object deviceUpdate(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b){return Envelope.ok(s.update(token(r),"devices",id,b,false));}
 @DeleteMapping("/devices/{id}")public Object deviceDelete(HttpServletRequest r,@PathVariable String id){return Envelope.ok(s.update(token(r),"devices",id,Collections.emptyMap(),true));}
 @GetMapping("/gates")public Object gates(HttpServletRequest r){return s.list(token(r),"gates",Collections.emptyMap());}
 @PatchMapping("/gates/{id}")public Object gate(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b){return Envelope.ok(s.update(token(r),"gates",id,b,false));}
 @GetMapping("/access-rules")public Object rules(HttpServletRequest r){return s.list(token(r),"access_rules",Collections.emptyMap());}
 @PatchMapping("/access-rules/{id}")public Object rule(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b){return Envelope.ok(s.update(token(r),"access_rules",id,b,false));}
 @PostMapping("/access-rules/validate")public Object validate(HttpServletRequest r,@RequestBody Map<String,Object>b){return Envelope.ok(s.evaluate(token(r),b,false,null));}
}
