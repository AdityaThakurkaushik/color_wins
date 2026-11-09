package com.example.demo.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "referral_agent_earnings")
public class ReferralAgentEarning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agent_id", nullable = false)
    private ReferralAgent agent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referred_user_id")
    private User referredUser;

    @Column(name = "deposit_id")
    private Long depositId;

    @Column(nullable = false, length = 30)
    private String kind;

    @Column(precision = 5, scale = 2)
    private BigDecimal percent;

    @Column(name = "base_amount", nullable = false)
    private Long baseAmount = 0L;

    @Column(nullable = false)
    private Long coins;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 80)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected ReferralAgentEarning() {
    }

    public ReferralAgentEarning(
            ReferralAgent agent,
            User referredUser,
            Long depositId,
            String kind,
            BigDecimal percent,
            long baseAmount,
            long coins,
            String idempotencyKey) {
        this.agent = agent;
        this.referredUser = referredUser;
        this.depositId = depositId;
        this.kind = kind;
        this.percent = percent;
        this.baseAmount = baseAmount;
        this.coins = coins;
        this.idempotencyKey = idempotencyKey;
    }

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public ReferralAgent getAgent() {
        return agent;
    }

    public User getReferredUser() {
        return referredUser;
    }

    public Long getDepositId() {
        return depositId;
    }

    public String getKind() {
        return kind;
    }

    public BigDecimal getPercent() {
        return percent;
    }

    public Long getBaseAmount() {
        return baseAmount;
    }

    public Long getCoins() {
        return coins;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
