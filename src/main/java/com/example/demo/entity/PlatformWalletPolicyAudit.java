package com.example.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "platform_wallet_policy_audit")
public class PlatformWalletPolicyAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_username", nullable = false, length = 80)
    private String actorUsername;

    @Column(name = "target_user_id")
    private Long targetUserId;

    @Column(name = "setting_key", nullable = false, length = 80)
    private String settingKey;

    @Column(name = "old_value", length = 80)
    private String oldValue;

    @Column(name = "new_value", length = 80)
    private String newValue;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected PlatformWalletPolicyAudit() {
    }

    public PlatformWalletPolicyAudit(
            String actorUsername,
            Long targetUserId,
            String settingKey,
            String oldValue,
            String newValue) {
        this.actorUsername = actorUsername;
        this.targetUserId = targetUserId;
        this.settingKey = settingKey;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getActorUsername() {
        return actorUsername;
    }

    public Long getTargetUserId() {
        return targetUserId;
    }

    public String getSettingKey() {
        return settingKey;
    }

    public String getOldValue() {
        return oldValue;
    }

    public String getNewValue() {
        return newValue;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
