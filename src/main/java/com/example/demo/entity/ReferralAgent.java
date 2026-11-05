package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "referral_agents")
public class ReferralAgent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_code", nullable = false, unique = true, length = 30)
    private String agentCode;

    @Column(nullable = false, unique = true, length = 40)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "display_name", length = 60)
    private String displayName;

    @Column(name = "virtual_points", nullable = false)
    private Long virtualPoints = 0L;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected ReferralAgent() {
    }

    public ReferralAgent(String agentCode, String username, String passwordHash, String displayName) {
        this.agentCode = agentCode;
        this.username = username;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.virtualPoints = 0L;
        this.active = true;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getAgentCode() {
        return agentCode;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Long getVirtualPoints() {
        return virtualPoints;
    }

    public void setVirtualPoints(Long virtualPoints) {
        if (virtualPoints == null || virtualPoints < 0) {
            throw new IllegalArgumentException("Invalid agent balance");
        }
        this.virtualPoints = virtualPoints;
    }

    public boolean isActive() {
        return Boolean.TRUE.equals(active);
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
