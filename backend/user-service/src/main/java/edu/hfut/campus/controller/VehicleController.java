package edu.hfut.campus.controller;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import edu.hfut.campus.entity.UserEntity;
import edu.hfut.campus.service.CredentialService;
import static edu.hfut.campus.dto.Responses.*;
@RestController @RequestMapping("/api/vehicles")public class VehicleController  {
  final CredentialService s;
  public VehicleController(CredentialService s)  {
    this.s=s;
  }
  @GetMapping public Object list(HttpServletRequest r,@RequestParam Map<String,String>q)  {
    return s.vehicles((UserEntity)r.getAttribute("identity"),q);
  }
  @PostMapping public ResponseEntity<?> create(HttpServletRequest r,@RequestBody Map<String,Object>b)  {
    return ResponseEntity.status(201).body(ok(s.vehicle((UserEntity)r.getAttribute("identity"),null,b,false)));
  }
  @PatchMapping("/{id}")public Object update(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b)  {
    return ok(s.vehicle((UserEntity)r.getAttribute("identity"),id,b,false));
  }
  @DeleteMapping("/{id}")public Object delete(HttpServletRequest r,@PathVariable String id)  {
    return ok(s.vehicle((UserEntity)r.getAttribute("identity"),id,Collections.emptyMap(),true));
  }
}
