package edu.hfut.campus.lab;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/lab")
public class LabController {
 private final LabItemService service; private final String port; private final long identityDelayMs;
 public LabController(LabItemService service,@Value("${server.port}") String port,@Value("${lab.identity-delay-ms:0}") long delay){this.service=service;this.port=port;this.identityDelayMs=delay;}
 @GetMapping("/identity") public Map<String,Object> identity() throws InterruptedException {
  if(identityDelayMs>0) Thread.sleep(Math.min(identityDelayMs,800));
  return Map.of("service","lab-provider","instance",port,"instanceId","lab-provider:"+port,"port",Integer.parseInt(port),"fallback",false);
 }
 @GetMapping("/items") public List<LabItem> list(){return service.list();}
 @GetMapping("/items/{id}") public LabItem find(@PathVariable long id){return service.find(id);}
 @PostMapping("/items") @ResponseStatus(HttpStatus.CREATED) public LabItem create(@RequestBody LabItem item){return service.create(item.getLabel());}
 @PatchMapping("/items/{id}") public LabItem update(@PathVariable long id,@RequestBody LabItem item){return service.update(id,item.getLabel());}
 @DeleteMapping("/items/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable long id){service.delete(id);}
}
