package edu.hfut.incidents.controller;import java.util.*;import javax.servlet.http.HttpServletRequest;import org.springframework.web.bind.annotation.*;import edu.hfut.incidents.service.IncidentService;import edu.hfut.incidents.dto.Envelope;import static edu.hfut.incidents.security.Identity.token;
@RestController @RequestMapping("/api/blacklist")public class BlacklistController{
 private final IncidentService s;public BlacklistController(IncidentService s){this.s=s;}
 @GetMapping public Object list(HttpServletRequest r,@RequestParam Map<String,String>q){Object rows=s.blackList(token(r),q);Map<String,Object>out=Envelope.ok(rows);out.put("total",((List)rows).size());return out;}
 @PostMapping public Object create(HttpServletRequest r,@RequestBody Map<String,Object>b){return Envelope.ok(s.createBlack(token(r),b));}
 @PatchMapping("/{id}")public Object update(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b){return Envelope.ok(s.updateBlack(token(r),id,b));}
}
