package edu.hfut.campus.controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import javax.servlet.http.HttpServletRequest;
import java.util.*;
import edu.hfut.campus.service.AuthService;
import edu.hfut.campus.entity.UserEntity;
import edu.hfut.campus.security.Authentication;
import static edu.hfut.campus.dto.Responses.*;
@RestController @RequestMapping("/api/auth") public class AuthController  {
  private final AuthService s;
  public AuthController(AuthService s)  {
    this.s=s;
  }
  @PostMapping("/login")public Object login(@RequestBody edu.hfut.campus.dto.LoginRequest b)  {
    return ok(s.login(b.values()));
  }
  @PostMapping("/logout")public Object logout(HttpServletRequest r)  {
    return ok(s.logout(Authentication.token(r)));
  }
  @GetMapping("/me")public Object me(HttpServletRequest r,@RequestParam Map<String,String>q)  {
    return ok(s.me((UserEntity)r.getAttribute("identity"),Authentication.token(r),q));
  }
  @PatchMapping("/password")public Object password(HttpServletRequest r,@RequestBody Map<String,Object>b)  {
    return ok(s.change((UserEntity)r.getAttribute("identity"),b));
  }
  @PostMapping("/send-code")public Object send(@RequestBody Map<String,Object>b)  {
    return ok(s.send(b,false));
  }
  @PostMapping("/reset-code")public Object resetCode(@RequestBody Map<String,Object>b)  {
    return ok(s.send(b,true));
  }
  @PostMapping("/reset-password")public Object reset(@RequestBody Map<String,Object>b)  {
    return ok(s.reset(b));
  }
  @PostMapping("/register-visitor")public ResponseEntity<?> register(@RequestBody Map<String,Object>b)  {
    return ResponseEntity.status(201).body(ok(s.register(b)));
  }
}
