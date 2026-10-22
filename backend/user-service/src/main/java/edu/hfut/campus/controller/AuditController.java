package edu.hfut.campus.controller;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import edu.hfut.campus.entity.UserEntity;
import edu.hfut.campus.service.MessageService;
@RestController public class AuditController  {
  final MessageService s;
  public AuditController(MessageService s)  {
    this.s=s;
  }
  @GetMapping("/api/logs")public Object list(HttpServletRequest r,@RequestParam Map<String,String>q)  {
    return s.logs((UserEntity)r.getAttribute("identity"),q);
  }
}
