package edu.hfut.aggregate.controller;
import javax.servlet.http.*;import org.springframework.web.bind.annotation.*;import edu.hfut.aggregate.service.AggregationService;import static edu.hfut.aggregate.controller.DashboardController.token;
@RestController public class ReportController{
 private final AggregationService s;public ReportController(AggregationService s){this.s=s;}
 @GetMapping("/api/reports/summary")public Object summary(HttpServletRequest r){return s.summary(token(r));}
 @GetMapping("/api/reports/access")public Object access(@RequestParam(required=false)String status,@RequestParam(required=false)String gate,HttpServletRequest r){return s.access(status,gate,token(r));}
}
