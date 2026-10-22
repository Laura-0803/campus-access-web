package edu.hfut.campus.controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import edu.hfut.campus.entity.UserEntity;
import edu.hfut.campus.service.AdminService;
import static edu.hfut.campus.dto.Responses.*;
@RestController @RequestMapping("/api/people")public class PersonAdminController  {
  final AdminService s;
  public PersonAdminController(AdminService s)  {
    this.s=s;
  }
  @PostMapping public ResponseEntity<?> create(HttpServletRequest r,@RequestBody Map<String,Object>b)  {
    return ResponseEntity.status(201).body(ok(s.person((UserEntity)r.getAttribute("identity"),null,b)));
  }
  @PatchMapping("/{id}")public Object update(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b)  {
    return ok(s.person((UserEntity)r.getAttribute("identity"),id,b));
  }
}
