package edu.hfut.campus.controller;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import edu.hfut.campus.service.ProfileService;
import edu.hfut.campus.entity.UserEntity;
import static edu.hfut.campus.dto.Responses.*;
@RestController @RequestMapping("/api/profiles") public class ProfileController  {
  private final ProfileService s;
  public ProfileController(ProfileService s)  {
    this.s=s;
  }
  @GetMapping("/{role}")public Object get(HttpServletRequest r,@PathVariable String role,@RequestParam Map<String,String>q)  {
    return ok(s.profile((UserEntity)r.getAttribute("identity"),role,q,Collections.emptyMap(),false));
  }
  @PatchMapping("/{role}")public Object update(HttpServletRequest r,@PathVariable String role,@RequestParam Map<String,String>q,@RequestBody Map<String,Object>b)  {
    return ok(s.profile((UserEntity)r.getAttribute("identity"),role,q,b,true));
  }
}
