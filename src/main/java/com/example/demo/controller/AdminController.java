package com.example.demo.controller;

import com.example.demo.entity.ReferralSettings;
import com.example.demo.repository.BetRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.CommissionSettingService;
import com.example.demo.service.ReferralSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final BetRepository betRepository;
    private final ReferralSettingsService referralSettingsService;
    private final CommissionSettingService commissionSettingService;

    public AdminController(
            UserRepository userRepository,
            BetRepository betRepository,
            ReferralSettingsService referralSettingsService,
            CommissionSettingService commissionSettingService) {

        this.userRepository = userRepository;
        this.betRepository = betRepository;
        this.referralSettingsService = referralSettingsService;
        this.commissionSettingService = commissionSettingService;
    }

    @GetMapping("/health")
    public Map<String, String> adminHealth() {
        return Map.of(
                "status", "ok",
                "message", "Admin authorization successful"
        );
    }

    @GetMapping("/stats/users")
    public Map<String, Long> getTotalUsers() {
        return Map.of(
                "totalUsers", userRepository.count()
        );
    }

    @GetMapping("/stats/virtual-points")
    public Map<String, Long> getTotalVirtualPoints() {
        long totalVirtualPoints = userRepository.findAll()
                .stream()
                .mapToLong(user -> user.getVirtualPoints())
                .sum();

        return Map.of(
                "totalVirtualPoints", totalVirtualPoints
        );
    }

    @GetMapping("/stats/bets")
    public Map<String, Long> getTotalBets() {
        return Map.of(
                "totalBets", betRepository.count()
        );
    }

    // Get referral settings
    @GetMapping("/referral-settings")
    public ReferralSettings getReferralSettings() {
        return referralSettingsService.getSettings();
    }

    // Update referral settings
    @PutMapping("/referral-settings")
    public ReferralSettings updateReferralSettings(
            @RequestBody ReferralSettingsRequest request) {

        return referralSettingsService.updateSettings(
                request.enabled(),
                request.referrerReward(),
                request.referredUserReward(),
                request.rewardCondition()
        );
    }

    // Get current commission setting
    @GetMapping("/commission-settings")
    public Map<String, BigDecimal> getCommissionSettings() {
        return Map.of(
                "commissionPercent",
                commissionSettingService.getCurrentCommission()
        );
    }

    // Update commission setting
    @PutMapping("/commission-settings")
    public ResponseEntity<Map<String, Object>> updateCommissionSettings(
            @RequestBody CommissionSettingRequest request) {

        BigDecimal commission = request.commissionPercent();

        if (commission == null ||
                !(commission.compareTo(new BigDecimal("5")) == 0 ||
                  commission.compareTo(new BigDecimal("10")) == 0 ||
                  commission.compareTo(new BigDecimal("15")) == 0 ||
                  commission.compareTo(new BigDecimal("20")) == 0)) {

            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Commission must be 5, 10, 15 or 20 percent"
            ));
        }

        BigDecimal updatedCommission =
                commissionSettingService.updateCommission(commission);

        return ResponseEntity.ok(Map.of(
                "message", "Commission updated successfully",
                "commissionPercent", updatedCommission
        ));
    }

    public record ReferralSettingsRequest(
            Boolean enabled,
            Long referrerReward,
            Long referredUserReward,
            String rewardCondition
    ) {
    }

    public record CommissionSettingRequest(
            BigDecimal commissionPercent
    ) {
    }
}