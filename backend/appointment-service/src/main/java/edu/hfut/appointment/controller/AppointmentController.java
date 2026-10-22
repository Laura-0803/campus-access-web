package edu.hfut.appointment.controller;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import edu.hfut.appointment.service.AppointmentQueries;
@RestController @RequestMapping("/api/appointments") public class AppointmentController {
 private final edu.hfut.appointment.service.impl.FinalApprovalService finals;private final AppointmentQueries service;private final edu.hfut.appointment.service.AppointmentCommands commands;
 public AppointmentController(AppointmentQueries service,edu.hfut.appointment.service.AppointmentCommands commands,edu.hfut.appointment.service.impl.FinalApprovalService finals){this.finals=finals;this.service=service;this.commands=commands;}
 private String token(HttpServletRequest r){String h=r.getHeader("Authorization");return h!=null&&h.toLowerCase(Locale.ROOT).startsWith("bearer ")?h.substring(7).trim():r.getHeader("x-campus-token");}
 @GetMapping({"","/"})public Object list(HttpServletRequest r,@RequestParam Map<String,String> q){return service.list(token(r),q);}
 @GetMapping("/hosts")public Object hosts(HttpServletRequest r){return service.hosts(token(r));}
 @GetMapping("/{id}")public Object one(HttpServletRequest r,@PathVariable String id){return service.one(token(r),id);}
 @PostMapping public org.springframework.http.ResponseEntity<?> create(HttpServletRequest r,@RequestBody Map<String,Object>b){return org.springframework.http.ResponseEntity.status(201).body(edu.hfut.appointment.dto.Envelope.ok(commands.create(token(r),b)));}
 @PatchMapping("/{id}/review")public Object review(HttpServletRequest r,@PathVariable String id,@RequestBody(required=false)Map<String,Object>b){if(b!=null&&finals.routes(token(r),b))return edu.hfut.appointment.dto.Envelope.ok(finals.approve(token(r),id,b));return edu.hfut.appointment.dto.Envelope.ok(commands.review(token(r),id,b==null?Collections.emptyMap():b));}
}
