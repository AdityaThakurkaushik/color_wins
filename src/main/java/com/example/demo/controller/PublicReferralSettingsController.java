
package com.example.demo.controller;

import com.example.demo.entity.ReferralSettings;
import com.example.demo.service.ReferralSettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/referral-settings")
public class PublicReferralSettingsController {

    private final ReferralSettingsService referralSettingsService;

    public PublicReferralSettingsController(
            ReferralSettingsService referralSettingsService) {
        this.referralSettingsService = referralSettingsService;
    }

    @GetMapping
    public Map<String, Object> getPublicReferralSettings() {

        ReferralSettings settings =
                referralSettingsService.getSettings();

        return Map.of(
                "enabled", settings.getEnabled(),
                "referrerReward", settings.getReferrerReward(),
                "referredUserReward", settings.getReferredUserReward(),
                "rewardCondition", settings.getRewardCondition()
        );
    }
}
