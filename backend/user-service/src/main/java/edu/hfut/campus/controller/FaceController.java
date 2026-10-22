package edu.hfut.campus.controller;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import edu.hfut.campus.entity.UserEntity;
import edu.hfut.campus.service.CredentialService;
import static edu.hfut.campus.dto.Responses.*;
@RestController @RequestMapping("/api/faces")public class FaceController  {
  final CredentialService s;
  public FaceController(CredentialService s)  {
    this.s=s;
  }
  @GetMapping public Object list(HttpServletRequest r,@RequestParam Map<String,String>q)  {
    return s.faces((UserEntity)r.getAttribute("identity"),q);
  }
  @PostMapping("/upload")public ResponseEntity<?> upload(HttpServletRequest r,@RequestParam Map<String,String>q,@RequestBody Map<String,Object>b)  {
    return ResponseEntity.status(201).body(ok(s.upload((UserEntity)r.getAttribute("identity"),q,b)));
  }
}
