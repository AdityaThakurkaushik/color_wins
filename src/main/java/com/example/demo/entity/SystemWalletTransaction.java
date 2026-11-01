package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "system_wallet_transactions")
public class SystemWalletTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wallet_id", nullable = false)
    private SystemWallet wallet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id")
    private GameRound round;

    @Column(nullable = false)
    private Long amount;

    @Column(name = "transaction_type", nullable = false, length = 40)
    private String transactionType;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 120)
    private String idempotencyKey;

    @Column(length = 255)
    private String description;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected SystemWalletTransaction() {}

    public SystemWalletTransaction(SystemWallet wallet, GameRound round, long amount,
            String transactionType, String idempotencyKey, String description) {
        this.wallet = wallet;
        this.round = round;
        this.amount = amount;
        this.transactionType = transactionType;
        this.idempotencyKey = idempotencyKey;
        this.description = description;
        this.createdAt = OffsetDateTime.now();
    }
}