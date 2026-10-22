package edu.hfut.campus.controller;
import org.springframework.web.bind.annotation.*;
import edu.hfut.campus.dto.LegacyAccessEvent;
import edu.hfut.campus.service.LegacyAccessEventService;
import static edu.hfut.campus.dto.Responses.*;
@RestController public class LegacyAccessEventController  {
  final LegacyAccessEventService s;
  public LegacyAccessEventController(LegacyAccessEventService s)  {
    this.s=s;
  }
  @PostMapping("/internal/access-events")public Object accept(@RequestBody LegacyAccessEvent e)  {
    s.accept(e);
    return map("accepted",true);
  }
}
