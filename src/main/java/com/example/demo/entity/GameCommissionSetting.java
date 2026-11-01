package com.example.demo.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "game_commission_settings")
public class GameCommissionSetting {
    @Id
    private Short id = 1;

    @Column(name = "commission_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionPercent = new BigDecimal("5.00");

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    protected GameCommissionSetting() {}

    @PrePersist
    @PreUpdate
    protected void touch() { updatedAt = OffsetDateTime.now(); }

    public BigDecimal getCommissionPercent() { return commissionPercent; }
    public void update(BigDecimal value, User admin) {
        this.commissionPercent = value;
        this.updatedBy = admin;
        this.updatedAt = OffsetDateTime.now();
    }
}