
package com.example.demo.controller;

import com.example.demo.dto.LoginRequest;
import com.example.demo.service.LoginService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private final LoginService loginService;

    public LoginController(LoginService loginService) {
        this.loginService = loginService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(
            @Valid @RequestBody LoginRequest request) {

        String token = loginService.login(request);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "token", token,
                "tokenType", "Bearer"
        ));
    }
}
