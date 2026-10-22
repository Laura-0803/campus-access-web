package edu.hfut.campus.controller;
import org.springframework.web.bind.annotation.*;
import edu.hfut.campus.service.AuthService;
import static edu.hfut.campus.dto.Responses.*;
@RestController public class RoleController  {
  private final AuthService s;
  public RoleController(AuthService s)  {
    this.s=s;
  }
  @GetMapping("/api/roles")public Object roles()  {
    return ok(s.roles());
  }
}
