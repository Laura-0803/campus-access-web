package edu.hfut.aggregate.controller;
import javax.servlet.http.*;import org.springframework.web.bind.annotation.*;import edu.hfut.aggregate.service.AggregationService;
@RestController public class DashboardController{
 private final AggregationService s;public DashboardController(AggregationService s){this.s=s;}
 public static String token(HttpServletRequest r){String h=r.getHeader("Authorization");return h!=null&&h.toLowerCase(java.util.Locale.ROOT).startsWith("bearer ")?h.substring(7).trim():r.getHeader("x-campus-token");}
 @GetMapping("/api/dashboard/admin")public Object admin(HttpServletRequest r){return s.admin(token(r));}
 @GetMapping("/api/dashboard/{role}")public Object role(@PathVariable String role,@RequestParam(required=false)String userId,HttpServletRequest r){return s.dashboard(role,userId,token(r));}
}
