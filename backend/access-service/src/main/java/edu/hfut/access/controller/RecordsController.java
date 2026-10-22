package edu.hfut.access.controller;import java.util.*;import javax.servlet.http.HttpServletRequest;import org.springframework.web.bind.annotation.*;import org.springframework.http.ResponseEntity;import edu.hfut.access.service.AccessOperations;import edu.hfut.access.dto.Envelope;import static edu.hfut.access.security.Identity.token;
@RestController @RequestMapping("/api/access-records")public class RecordsController{
 private final AccessOperations s;public RecordsController(AccessOperations s){this.s=s;}
 @GetMapping public Object list(HttpServletRequest r,@RequestParam Map<String,String>q){return s.list(token(r),"access_records",q);}
 @PostMapping public Object create(HttpServletRequest r,@RequestBody Map<String,Object>b){return ResponseEntity.status(201).body(Envelope.ok(s.create(token(r),"access_records",b)));}
 @PostMapping("/simulate")public Object simulate(HttpServletRequest r,@RequestBody Map<String,Object>b,@RequestHeader(value="Idempotency-Key",required=false)String key){return Envelope.ok(s.evaluate(token(r),b,true,key));}
}
