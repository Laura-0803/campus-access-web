package edu.hfut.appointment;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.cloud.netflix.hystrix.EnableHystrix;
import org.mybatis.spring.annotation.MapperScan;
@SpringBootApplication @EnableFeignClients @EnableHystrix @MapperScan("edu.hfut.appointment.dao")
public class AppointmentApplication {
 public static void main(String[] args){SpringApplication.run(AppointmentApplication.class,args);}
}
