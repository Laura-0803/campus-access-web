package edu.hfut.access.controller;import java.util.*;import javax.servlet.http.HttpServletRequest;import org.springframework.web.bind.annotation.*;import org.springframework.http.ResponseEntity;import edu.hfut.access.service.AccessOperations;import edu.hfut.access.dto.Envelope;import static edu.hfut.access.security.Identity.token;
@RestController @RequestMapping("/api/qr-codes")public class QrController{
 private final AccessOperations s;public QrController(AccessOperations s){this.s=s;}
 @GetMapping public Object list(HttpServletRequest r,@RequestParam Map<String,String>q){return s.list(token(r),"qr_codes",q);}
 @PostMapping public Object create(HttpServletRequest r,@RequestBody Map<String,Object>b){return ResponseEntity.status(201).body(Envelope.ok(s.create(token(r),"qr_codes",b)));}
 @PostMapping("/{id}/verify")public Object verify(HttpServletRequest r,@PathVariable String id,@RequestBody(required=false)Map<String,Object>b){return Envelope.ok(s.verify(token(r),id,b==null?Collections.emptyMap():b));}
 @PostMapping("/{id}/revoke")public Object revoke(HttpServletRequest r,@PathVariable String id){return Envelope.ok(s.update(token(r),"qr_codes",id,Collections.emptyMap(),false));}
}
