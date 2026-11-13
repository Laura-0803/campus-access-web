package edu.hfut.campus.lab;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
@Component
public class DatabaseBoundary {
 public DatabaseBoundary(@Value("${spring.datasource.url}") String url,@Value("${spring.datasource.username}") String user) {
  if (!url.matches("jdbc:mysql://(?:127[.]0[.]0[.]1|localhost):[0-9]+/campus_p1_lab_[0-9]{14}(?:[?].*)?") || !user.startsWith("p1_lab_"))
   throw new IllegalArgumentException("P1 provider requires an isolated loopback lab schema and restricted lab account");
 }
}
