package edu.hfut.aggregate;
import org.springframework.boot.*;import org.springframework.boot.autoconfigure.*;import org.springframework.cloud.openfeign.EnableFeignClients;import org.springframework.cloud.netflix.hystrix.EnableHystrix;
@SpringBootApplication @EnableFeignClients @EnableHystrix public class Application{public static void main(String[]a){SpringApplication.run(Application.class,a);}}