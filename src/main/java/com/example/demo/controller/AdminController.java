
package com.example.demo.controller;

import com.example.demo.entity.ReferralSettings;
import com.example.demo.repository.BetRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.ReferralSettingsService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final BetRepository betRepository;
    private final ReferralSettingsService referralSettingsService;

    public AdminController(
            UserRepository userRepository,
            BetRepository betRepository,
            ReferralSettingsService referralSettingsService) {

        this.userRepository = userRepository;
        this.betRepository = betRepository;
        this.referralSettingsService = referralSettingsService;
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

    public record ReferralSettingsRequest(
            Boolean enabled,
            Long referrerReward,
            Long referredUserReward,
            String rewardCondition
    ) {
    }
}
