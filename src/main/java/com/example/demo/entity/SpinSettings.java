package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "spin_settings")
public class SpinSettings {

    @Id
    private Short id = 1;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "min_bet", nullable = false)
    private Long minBet = 5L;

    @Column(name = "max_bet", nullable = false)
    private Long maxBet = 10000L;

    /** Exactly 10 comma-separated multipliers, e.g. 0,0,0,0,0,1.2,1.4,1.6,1.8,2.0 */
    @Column(nullable = false, length = 120)
    private String multipliers;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "updated_by", length = 60)
    private String updatedBy;

    protected SpinSettings() {
    }

    public Short getId() {
        return id;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Long getMinBet() {
        return minBet;
    }

    public void setMinBet(Long minBet) {
        this.minBet = minBet;
    }

    public Long getMaxBet() {
        return maxBet;
    }

    public void setMaxBet(Long maxBet) {
        this.maxBet = maxBet;
    }

    public String getMultipliers() {
        return multipliers;
    }

    public void setMultipliers(String multipliers) {
        this.multipliers = multipliers;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }
}
