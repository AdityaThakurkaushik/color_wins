package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "app.jwt.secret=test-only-secret-with-at-least-32-bytes")
class DemoApplicationTests {

	@Test
	void contextLoads() {
	}

}
