package com.example.demo.controller;

import com.example.demo.dto.EmailOnlyRequest;
import com.example.demo.dto.EmailOtpRequest;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class RegistrationController {

    private final RegistrationService registrationService;

    public RegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody RegisterRequest request) {

        RegistrationService.RegisterResult result = registrationService.register(request);

        Map<String, String> body = new LinkedHashMap<>();
        body.put("status", "PENDING_VERIFICATION");
        if (result.telegramDeepLink() == null || result.telegramDeepLink().isBlank()) {
            body.put("message", "Account created, but Telegram bot is not configured yet");
        } else {
            body.put("message", "Open Telegram and verify your account");
            body.put("telegramDeepLink", result.telegramDeepLink());
            body.put("botUsername", result.botUsername() == null ? "" : result.botUsername());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @GetMapping("/verification-status")
    public ResponseEntity<Map<String, Object>> verificationStatus(@RequestParam String email) {
        boolean verified = registrationService.isVerified(email);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "verified", verified
        ));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(
            @Valid @RequestBody EmailOtpRequest request) {

        registrationService.verifyEmail(request.getEmail(), request.getCode());

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Verified. You can log in now"
        ));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(
            @Valid @RequestBody EmailOnlyRequest request) {

        RegistrationService.RegisterResult result =
                registrationService.resendVerification(request.getEmail());

        Map<String, String> body = new LinkedHashMap<>();
        body.put("status", "SUCCESS");
        body.put("message", "Naya Telegram verification link ready hai");
        body.put("telegramDeepLink", result.telegramDeepLink());
        body.put("botUsername", result.botUsername() == null ? "" : result.botUsername());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody EmailOnlyRequest request) {

        RegistrationService.ForgotResult result =
                registrationService.forgotPassword(request.getEmail());

        Map<String, String> body = new LinkedHashMap<>();
        body.put("status", "SUCCESS");
        body.put("message", "If the account exists, open the Telegram reset link");
        if (result.telegramDeepLink() != null && !result.telegramDeepLink().isBlank()) {
            body.put("telegramDeepLink", result.telegramDeepLink());
            body.put("botUsername", result.botUsername() == null ? "" : result.botUsername());
        }
        return ResponseEntity.ok(body);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody EmailOtpRequest request) {

        registrationService.resetPassword(
                request.getEmail(),
                request.getCode(),
                request.getNewPassword());

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Password updated. You can log in now"
        ));
    }
}
