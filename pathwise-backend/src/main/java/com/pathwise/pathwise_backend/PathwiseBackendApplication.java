package com.pathwise.pathwise_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.pathwise")
public class PathwiseBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(PathwiseBackendApplication.class, args);
	}

}
