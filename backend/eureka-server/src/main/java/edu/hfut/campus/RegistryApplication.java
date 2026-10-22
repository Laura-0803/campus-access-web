package edu.hfut.campus;
import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.*;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;
@SpringBootApplication @EnableEurekaServer public class RegistryApplication  {
  public static void main(String[] a)  {
    SpringApplication.run(RegistryApplication.class,a);
  }
}
