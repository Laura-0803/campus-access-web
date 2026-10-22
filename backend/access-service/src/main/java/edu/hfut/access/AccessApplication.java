package edu.hfut.access;
import org.springframework.boot.*;import org.springframework.boot.autoconfigure.*;import org.springframework.cloud.openfeign.*;import org.springframework.cloud.netflix.hystrix.*;import org.mybatis.spring.annotation.MapperScan;
@SpringBootApplication @EnableFeignClients @EnableHystrix @MapperScan("edu.hfut.access.dao") public class AccessApplication {public static void main(String[]a){SpringApplication.run(AccessApplication.class,a);}}
