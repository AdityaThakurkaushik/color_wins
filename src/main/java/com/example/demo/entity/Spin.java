package com.example.demo.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "spins")
public class Spin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Long amount;

    @Column(name = "segment_index", nullable = false)
    private Short segmentIndex;

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal multiplier;

    @Column(nullable = false)
    private Long payout = 0L;

    @Column(nullable = false)
    private Long net;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Spin() {
    }

    public Spin(
            User user,
            Long amount,
            Short segmentIndex,
            BigDecimal multiplier,
            Long payout,
            Long net) {
        this.user = user;
        this.amount = amount;
        this.segmentIndex = segmentIndex;
        this.multiplier = multiplier;
        this.payout = payout;
        this.net = net;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Long getAmount() {
        return amount;
    }

    public Short getSegmentIndex() {
        return segmentIndex;
    }

    public BigDecimal getMultiplier() {
        return multiplier;
    }

    public Long getPayout() {
        return payout;
    }

    public Long getNet() {
        return net;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
