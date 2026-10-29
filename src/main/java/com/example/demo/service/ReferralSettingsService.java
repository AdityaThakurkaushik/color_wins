package com.example.demo.service;

import com.example.demo.entity.ReferralSettings;
import com.example.demo.repository.ReferralSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReferralSettingsService {

    private static final short SETTINGS_ID = 1;

    private final ReferralSettingsRepository repository;

    public ReferralSettingsService(
            ReferralSettingsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public ReferralSettings getSettings() {
        return repository.findById(SETTINGS_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "Referral settings not found. Check V4 migration."));
    }

    @Transactional
    public ReferralSettings updateSettings(
            Boolean enabled,
            Long referrerReward,
            Long referredUserReward,
            String rewardCondition) {

        ReferralSettings settings = repository
                .findByIdForUpdate(SETTINGS_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "Referral settings not found. Check V4 migration."));

        if (enabled == null) {
            throw new IllegalArgumentException(
                    "Enabled status is required");
        }

        settings.setEnabled(enabled);
        settings.setReferrerReward(referrerReward);
        settings.setReferredUserReward(referredUserReward);
        settings.setRewardCondition(rewardCondition);

        return repository.save(settings);
    }
}