package edu.hfut.campus.lab;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.cloud.client.circuitbreaker.EnableCircuitBreaker;
@SpringBootApplication @EnableFeignClients @EnableCircuitBreaker
public class ConsumerApplication { public static void main(String[] args) { SpringApplication.run(ConsumerApplication.class,args); } }
