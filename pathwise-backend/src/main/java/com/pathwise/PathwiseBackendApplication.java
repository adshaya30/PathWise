package com.pathwise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableCaching
public class PathwiseBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(PathwiseBackendApplication.class, args);
    }

}
