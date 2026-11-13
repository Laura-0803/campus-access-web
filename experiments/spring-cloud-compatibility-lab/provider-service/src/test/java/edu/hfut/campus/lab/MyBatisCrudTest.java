package edu.hfut.campus.lab;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
@SpringBootTest(properties={"eureka.client.enabled=false","spring.cloud.discovery.enabled=false"})
class MyBatisCrudTest {
 @Autowired LabItemService service;
 @Test @Transactional void realMysqlParameterizedCrudAndMissingRow() {
  String payload="synthetic quote ' ; SELECT --";
  LabItem created=service.create(payload); assertNotNull(created.getId());
  assertEquals(payload,service.find(created.getId()).getLabel());
  service.update(created.getId(),"updated synthetic item");
  assertEquals("updated synthetic item",service.find(created.getId()).getLabel());
  service.delete(created.getId());assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.find(created.getId()));
 }
 @Test void productionDatabaseBoundaryRejected(){assertThrows(IllegalArgumentException.class,()->new DatabaseBoundary("jdbc:mysql://127.0.0.1:3306/campus_access","root"));}
}
