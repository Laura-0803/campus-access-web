package edu.hfut.campus.controller;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import edu.hfut.campus.entity.UserEntity;
import edu.hfut.campus.service.MessageService;
import static edu.hfut.campus.dto.Responses.*;
@RestController @RequestMapping("/api/messages")public class MessageController  {
  final MessageService s;
  public MessageController(MessageService s)  {
    this.s=s;
  }
  @GetMapping public Object list(HttpServletRequest r,@RequestParam Map<String,String>q)  {
    return s.list((UserEntity)r.getAttribute("identity"),q);
  }
  @PostMapping public ResponseEntity<?> create(HttpServletRequest r,@RequestBody Map<String,Object>b)  {
    return ResponseEntity.status(201).body(ok(s.write((UserEntity)r.getAttribute("identity"),null,Collections.emptyMap(),b,"create")));
  }
  @PatchMapping("/{id}")public Object update(HttpServletRequest r,@PathVariable String id,@RequestBody Map<String,Object>b)  {
    return ok(s.write((UserEntity)r.getAttribute("identity"),id,Collections.emptyMap(),b,"update"));
  }
  @PatchMapping("/{id}/read")public Object read(HttpServletRequest r,@PathVariable String id,@RequestParam Map<String,String>q,@RequestBody(required=false)Map<String,Object>b)  {
    return ok(s.write((UserEntity)r.getAttribute("identity"),id,q,b==null?Collections.emptyMap():b,"read"));
  }
  @DeleteMapping("/{id}")public Object delete(HttpServletRequest r,@PathVariable String id)  {
    return ok(s.write((UserEntity)r.getAttribute("identity"),id,Collections.emptyMap(),Collections.emptyMap(),"delete"));
  }
}
