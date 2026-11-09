package com.example.demo.controller;

import com.example.demo.service.SpinService;
import com.example.demo.service.SpinSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/xpinr")
public class AdminSpinController {

    private final SpinService spinService;
    private final SpinSettingsService spinSettingsService;

    public AdminSpinController(SpinService spinService, SpinSettingsService spinSettingsService) {
        this.spinService = spinService;
        this.spinSettingsService = spinSettingsService;
    }

    public record UpdateSpinSettingsRequest(
            Boolean enabled,
            Long minBet,
            Long maxBet,
            List<BigDecimal> multipliers
    ) {
    }

    @GetMapping
    public ResponseEntity<?> overview(@RequestParam(defaultValue = "25") int recentLimit) {
        return ResponseEntity.ok(spinService.adminOverview(recentLimit));
    }

    @GetMapping("/settings")
    public ResponseEntity<?> settings() {
        return ResponseEntity.ok(spinSettingsService.publicConfig());
    }

    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(
            @RequestBody UpdateSpinSettingsRequest request,
            Authentication authentication) {
        String admin = authentication == null ? "admin" : authentication.getName();
        Map<String, Object> updated = spinSettingsService.updateSettings(
                request == null ? null : request.enabled(),
                request == null ? null : request.minBet(),
                request == null ? null : request.maxBet(),
                request == null ? null : request.multipliers(),
                admin
        );
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "stats", spinService.adminStats()
        ));
    }
}
