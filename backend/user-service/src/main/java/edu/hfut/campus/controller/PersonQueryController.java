package edu.hfut.campus.controller;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import edu.hfut.campus.service.ProfileService;
import edu.hfut.campus.entity.UserEntity;
@RestController @RequestMapping("/api/people") public class PersonQueryController  {
  private final ProfileService s;
  public PersonQueryController(ProfileService s)  {
    this.s=s;
  }
  @GetMapping public Object list(HttpServletRequest r,@RequestParam Map<String,String>q)  {
    return s.people((UserEntity)r.getAttribute("identity"),q);
  }
  @GetMapping("/{id}")public Object one(HttpServletRequest r,@PathVariable String id)  {
    return s.person((UserEntity)r.getAttribute("identity"),id);
  }
}
