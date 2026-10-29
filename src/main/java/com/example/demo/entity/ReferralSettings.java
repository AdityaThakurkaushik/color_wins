package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "referral_settings")
public class ReferralSettings {

    @Id
    private Short id = 1;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(name = "referrer_reward", nullable = false)
    private Long referrerReward = 20L;

    @Column(name = "referred_user_reward", nullable = false)
    private Long referredUserReward = 10L;

    @Column(name = "reward_condition", nullable = false, length = 30)
    private String rewardCondition = "REGISTRATION";

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public ReferralSettings() {
    }

    @PrePersist
    @PreUpdate
    public void updateTimestamp() {
        updatedAt = OffsetDateTime.now();
    }

    public Short getId() {
        return id;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Long getReferrerReward() {
        return referrerReward;
    }

    public void setReferrerReward(Long referrerReward) {
        if (referrerReward == null || referrerReward < 0) {
            throw new IllegalArgumentException(
                "Referrer reward cannot be negative");
        }
        this.referrerReward = referrerReward;
    }

    public Long getReferredUserReward() {
        return referredUserReward;
    }

    public void setReferredUserReward(Long referredUserReward) {
        if (referredUserReward == null || referredUserReward < 0) {
            throw new IllegalArgumentException(
                "New user reward cannot be negative");
        }
        this.referredUserReward = referredUserReward;
    }

    public String getRewardCondition() {
        return rewardCondition;
    }

    public void setRewardCondition(String rewardCondition) {
        if (!"REGISTRATION".equals(rewardCondition)) {
            throw new IllegalArgumentException(
                "Unsupported referral reward condition");
        }
        this.rewardCondition = rewardCondition;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}