package com.example.demo.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "game_rounds")
public class GameRound {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "period_number", nullable = false, unique = true, length = 40)
    private String periodNumber;

    @Column(nullable = false, length = 20)
    private String status = "OPEN";

    @Column(name = "starts_at", nullable = false)
    private OffsetDateTime startsAt;

    @Column(name = "ends_at", nullable = false)
    private OffsetDateTime endsAt;

    @Column(name = "result_number")
    private Short resultNumber;

    @Column(name = "result_color", length = 10)
    private String resultColor;

    @Column(name = "commission_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionPercent = new BigDecimal("5.00");

    @Column(name = "settlement_status", nullable = false, length = 12)
    private String settlementStatus = "PENDING";

    @Column(name = "total_pool", nullable = false)
    private Long totalPool = 0L;

    @Column(name = "commission_amount", nullable = false)
    private Long commissionAmount = 0L;

    @Column(name = "winning_pool", nullable = false)
    private Long winningPool = 0L;

    @Column(name = "settled_at")
    private OffsetDateTime settledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected GameRound() {}

    public GameRound(String periodNumber, OffsetDateTime startsAt, OffsetDateTime endsAt) {
        this.periodNumber = periodNumber;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
    }

    @PrePersist
    protected void onCreate() { createdAt = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public String getPeriodNumber() { return periodNumber; }
    public String getStatus() { return status; }
    public OffsetDateTime getStartsAt() { return startsAt; }
    public OffsetDateTime getEndsAt() { return endsAt; }
    public Short getResultNumber() { return resultNumber; }
    public String getResultColor() { return resultColor; }
    public BigDecimal getCommissionPercent() { return commissionPercent; }
    public String getSettlementStatus() { return settlementStatus; }
    public Long getTotalPool() { return totalPool; }
    public Long getCommissionAmount() { return commissionAmount; }
    public Long getWinningPool() { return winningPool; }

    public void setEndsAt(OffsetDateTime endsAt) { this.endsAt = endsAt; }
    public void setCommissionPercent(BigDecimal value) { this.commissionPercent = value; }

    public void close() { this.status = "CLOSED"; }

    public void declareResult(Short number, String color) {
        this.resultNumber = number;
        this.resultColor = color;
        this.status = "RESULT_DECLARED";
    }

    public void completeSettlement(long pool, long commission, long payoutPool) {
        if (!"PENDING".equals(this.settlementStatus))
            throw new IllegalStateException("Round settlement already completed");
        this.totalPool = pool;
        this.commissionAmount = commission;
        this.winningPool = payoutPool;
        this.settlementStatus = "SETTLED";
        this.settledAt = OffsetDateTime.now();
    }

    public void completeCancellation(long pool) {
        if (!"PENDING".equals(this.settlementStatus))
            throw new IllegalStateException("Round settlement already completed");
        this.totalPool = pool;
        this.commissionAmount = 0L;
        this.winningPool = 0L;
        this.settlementStatus = "CANCELLED";
        this.status = "CANCELLED";
        this.settledAt = OffsetDateTime.now();
    }
}
