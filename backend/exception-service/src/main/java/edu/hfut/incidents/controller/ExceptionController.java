package edu.hfut.incidents.controller;import java.util.*;import javax.servlet.http.HttpServletRequest;import org.springframework.web.bind.annotation.*;import edu.hfut.incidents.service.IncidentService;import edu.hfut.incidents.dto.Envelope;import static edu.hfut.incidents.security.Identity.token;
@RestController @RequestMapping("/api/exceptions")public class ExceptionController{
 private final IncidentService s;public ExceptionController(IncidentService s){this.s=s;}
 @GetMapping public Object list(HttpServletRequest r,@RequestParam Map<String,String>q){Object rows=s.query(token(r),null,false,q);Map<String,Object>out=Envelope.ok(rows);out.put("total",((List)rows).size());return out;}
 @GetMapping("/analysis")public Object analysis(HttpServletRequest r){return Envelope.ok(s.query(token(r),null,true,Collections.emptyMap()));}
 @GetMapping("/{id}")public Object detail(HttpServletRequest r,@PathVariable String id){return Envelope.ok(s.query(token(r),id,false,Collections.emptyMap()));}
 @GetMapping("/{id}/analysis")public Object single(HttpServletRequest r,@PathVariable String id){return Envelope.ok(s.query(token(r),id,true,Collections.emptyMap()));}
 @PostMapping("/chat")public Object chat(HttpServletRequest r,@RequestBody Map<String,Object>b){return Envelope.ok(s.chat(token(r),b));}
 @PatchMapping("/{id}")public Object update(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b,@RequestHeader(value="Idempotency-Key",required=false)String k){return Envelope.ok(s.disposition(token(r),id,b,false,k));}
 @PostMapping("/{id}/actions")public Object action(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b,@RequestHeader(value="Idempotency-Key",required=false)String k){return Envelope.ok(s.disposition(token(r),id,b,true,k));}
}
