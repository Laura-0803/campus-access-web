package edu.hfut.campus.controller;
import org.springframework.web.bind.annotation.*;
import javax.servlet.http.HttpServletRequest;
import edu.hfut.campus.security.*;
import edu.hfut.campus.service.AuthService;
import edu.hfut.campus.entity.*;
import edu.hfut.campus.dao.UserMapper;
import static edu.hfut.campus.dto.Responses.*;
@RestController @RequestMapping("/internal") public class InternalController  {
  private final SessionAuthority auth;
  private final AuthService s;
  private final UserMapper d;
  public InternalController(SessionAuthority a,AuthService s,UserMapper d)  {
    auth=a;
    this.s=s;
    this.d=d;
  }
  @GetMapping("/session")public Object session(HttpServletRequest r)  {
    UserEntity u=auth.resolve(Authentication.token(r));
    return map("user",u,"role",u.role,"personId",u.personId,"person",d.person(u.personId));
  }
  @GetMapping("/projection")public Object projection()  {
    return s.projection();
  }
  @org.springframework.transaction.annotation.Transactional(readOnly=true) @GetMapping("/context")public Object context(HttpServletRequest r)  {
    UserEntity u=auth.resolve(Authentication.token(r));
    PersonEntity person=d.person(u.personId);
    if(person==null&&!"admin".equals(u.role))throw new edu.hfut.campus.exception.ApiException(403,"账号未关联有效人员档案");
    return map("identity",map("user",u,"role",u.role,"personId",u.personId,"person",person),"projection",s.projection());
  }
}
