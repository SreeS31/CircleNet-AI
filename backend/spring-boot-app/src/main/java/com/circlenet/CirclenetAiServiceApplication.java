package com.circlenet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CirclenetAiServiceApplication {
  public static void main(String[] args) {
    SpringApplication.run(CirclenetAiServiceApplication.class, args);
  }
}
