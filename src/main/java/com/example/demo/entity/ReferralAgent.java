package com.example.demo.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
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

    @Column(length = 20)
    private String phone;

    @Column(name = "payout_note", length = 200)
    private String payoutNote;

    @Column(name = "first_deposit_percent", precision = 5, scale = 2)
    private BigDecimal firstDepositPercent;

    @Column(name = "next_deposit_percent", precision = 5, scale = 2)
    private BigDecimal nextDepositPercent;

    @Column(name = "min_balance")
    private Long minBalance;

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

    public void setAgentCode(String agentCode) {
        this.agentCode = agentCode;
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

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPayoutNote() {
        return payoutNote;
    }

    public void setPayoutNote(String payoutNote) {
        this.payoutNote = payoutNote;
    }

    public BigDecimal getFirstDepositPercent() {
        return firstDepositPercent;
    }

    public void setFirstDepositPercent(BigDecimal firstDepositPercent) {
        this.firstDepositPercent = firstDepositPercent;
    }

    public BigDecimal getNextDepositPercent() {
        return nextDepositPercent;
    }

    public void setNextDepositPercent(BigDecimal nextDepositPercent) {
        this.nextDepositPercent = nextDepositPercent;
    }

    public Long getMinBalance() {
        return minBalance;
    }

    public void setMinBalance(Long minBalance) {
        if (minBalance != null && minBalance < 0) {
            throw new IllegalArgumentException("Minimum balance cannot be negative");
        }
        this.minBalance = minBalance;
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
