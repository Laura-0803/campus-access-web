package edu.hfut.campus;
import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.*;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.cloud.netflix.hystrix.EnableHystrix;
import org.mybatis.spring.annotation.MapperScan;
@SpringBootApplication @EnableFeignClients @EnableHystrix @MapperScan("edu.hfut.campus.dao") public class UserApplication  {
  public static void main(String[]a)  {
    SpringApplication.run(UserApplication.class,a);
  }
}
