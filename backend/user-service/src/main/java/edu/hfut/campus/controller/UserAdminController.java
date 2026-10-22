package edu.hfut.campus.controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import edu.hfut.campus.entity.UserEntity;
import edu.hfut.campus.service.AdminService;
import static edu.hfut.campus.dto.Responses.*;
@RestController @RequestMapping("/api/users")public class UserAdminController  {
  final AdminService s;
  public UserAdminController(AdminService s)  {
    this.s=s;
  }
  @GetMapping public Object list(HttpServletRequest r,@RequestParam(required=false)String role)  {
    return s.users((UserEntity)r.getAttribute("identity"),role);
  }
  @PostMapping public ResponseEntity<?> create(HttpServletRequest r,@RequestBody Map<String,Object>b)  {
    return ResponseEntity.status(201).body(ok(s.createUser((UserEntity)r.getAttribute("identity"),b)));
  }
  @PatchMapping("/{id}")public Object update(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b)  {
    return ok(s.updateUser((UserEntity)r.getAttribute("identity"),id,b));
  }
}
