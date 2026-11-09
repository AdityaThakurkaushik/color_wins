package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.SpinService;
import com.example.demo.service.SpinSettingsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/spins")
public class SpinController {

    private final SpinService spinService;
    private final SpinSettingsService spinSettingsService;
    private final UserRepository userRepository;

    public SpinController(
            SpinService spinService,
            SpinSettingsService spinSettingsService,
            UserRepository userRepository) {
        this.spinService = spinService;
        this.spinSettingsService = spinSettingsService;
        this.userRepository = userRepository;
    }

    public record PlaceSpinRequest(@NotNull @Min(5) Long amount) {
    }

    @GetMapping("/segments")
    public ResponseEntity<?> segments() {
        // Public config always comes from admin spin_settings (strict).
        return ResponseEntity.ok(spinSettingsService.publicConfig());
    }

    @PostMapping
    public ResponseEntity<?> placeSpin(
            @Valid @RequestBody PlaceSpinRequest request,
            Authentication authentication) {
        User user = requireUser(authentication);
        Map<String, Object> result = spinService.placeSpin(user.getId(), request.amount());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/me")
    public ResponseEntity<?> mySpins(
            Authentication authentication,
            @RequestParam(defaultValue = "8") int limit) {
        User user = requireUser(authentication);
        List<Map<String, Object>> rows = spinService.recentSpins(user.getId(), limit);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "spins", rows
        ));
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalArgumentException("Authentication required");
        }
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}
