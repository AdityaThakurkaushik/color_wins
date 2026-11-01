package com.example.demo.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "game_commission_audit_logs")
public class GameCommissionAuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "old_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal oldPercent;

    @Column(name = "new_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal newPercent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by")
    private User changedBy;

    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt;

    protected GameCommissionAuditLog() {}

    public BigDecimal getOldPercent() { return oldPercent; }
    public BigDecimal getNewPercent() { return newPercent; }
    public User getChangedBy() { return changedBy; }
    public OffsetDateTime getChangedAt() { return changedAt; }

    public GameCommissionAuditLog(BigDecimal oldPercent, BigDecimal newPercent, User changedBy) {
        this.oldPercent = oldPercent;
        this.newPercent = newPercent;
        this.changedBy = changedBy;
        this.changedAt = OffsetDateTime.now();
    }
}