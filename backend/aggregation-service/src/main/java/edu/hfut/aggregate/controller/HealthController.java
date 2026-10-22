package edu.hfut.aggregate.controller;
import org.springframework.web.bind.annotation.*;import edu.hfut.aggregate.service.AggregationService;
@RestController public class HealthController{private final AggregationService s;public HealthController(AggregationService s){this.s=s;}@GetMapping("/api/health")public Object health(){return s.health();}}
