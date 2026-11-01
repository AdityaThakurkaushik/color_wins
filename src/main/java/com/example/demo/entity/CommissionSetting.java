package com.example.demo.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "commission_settings")
public class CommissionSetting {

    @Id
    private Short id = 1;

    @Column(name = "commission_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionPercent = new BigDecimal("5.00");

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected CommissionSetting() {
    }

    @PrePersist
    @PreUpdate
    public void updateTimestamp() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Short getId() {
        return id;
    }

    public BigDecimal getCommissionPercent() {
        return commissionPercent;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setCommissionPercent(BigDecimal commissionPercent) {
        if (commissionPercent == null ||
                !(commissionPercent.compareTo(new BigDecimal("5")) == 0 ||
                  commissionPercent.compareTo(new BigDecimal("10")) == 0 ||
                  commissionPercent.compareTo(new BigDecimal("15")) == 0 ||
                  commissionPercent.compareTo(new BigDecimal("20")) == 0)) {
            throw new IllegalArgumentException(
                "Commission must be 5, 10, 15 or 20 percent"
            );
        }

        this.commissionPercent = commissionPercent;
    }
}