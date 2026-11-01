package com.example.demo.controller;

import com.example.demo.service.GameCommissionService;
import com.example.demo.service.SystemWalletService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/game-settlement")
public class GameSettlementAdminController {
    private final GameCommissionService commissionService;
    private final SystemWalletService walletService;

    public GameSettlementAdminController(GameCommissionService commissionService,
            SystemWalletService walletService) {
        this.commissionService = commissionService;
        this.walletService = walletService;
    }

    public record CommissionRequest(
            @NotNull @DecimalMin("0.00") BigDecimal commissionPercent) {}

    public record PlatformFundingRequest(
            @NotNull @Positive Long amount,
            @NotNull @Size(min = 1, max = 80) String requestId) {}

    @GetMapping("/settings")
    public Map<String, Object> getSettings() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("commissionPercent", commissionService.getCurrentPercent());
        response.put("singlePlayerRewardPercent", 25);
        return response;
    }

    @PutMapping("/settings/commission")
    public Map<String, Object> updateCommission(
            @Valid @RequestBody CommissionRequest request,
            Authentication authentication) {
        BigDecimal updated = commissionService.updatePercent(
                request.commissionPercent(), authentication.getName());
        return Map.of("status", "SUCCESS", "commissionPercent", updated);
    }

    @GetMapping("/settings/audit")
    public Map<String, Object> getCommissionAudit() {
        return Map.of("history", commissionService.getAuditHistory());
    }

    @GetMapping("/wallets")
    public Map<String, Object> getWallets() {
        return Map.of("wallets", walletService.getBalances());
    }

    @PostMapping("/wallets/platform/fund")
    public Map<String, Object> fundPlatformWallet(
            @Valid @RequestBody PlatformFundingRequest request,
            Authentication authentication) {
        walletService.fundPlatformWallet(
                request.amount(), request.requestId(), authentication.getName());
        return Map.of("status", "SUCCESS", "walletType", "PLATFORM",
                "fundedAmount", request.amount(), "wallets", walletService.getBalances());
    }
}
