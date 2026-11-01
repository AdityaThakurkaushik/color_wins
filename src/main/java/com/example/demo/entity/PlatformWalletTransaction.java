package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(
    name = "platform_wallet_transactions",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_platform_wallet_idempotency",
            columnNames = "idempotency_key"
        )
    }
)
public class PlatformWalletTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long amount;

    @Column(name = "transaction_type", nullable = false, length = 30)
    private String transactionType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "idempotency_key", nullable = false, length = 120)
    private String idempotencyKey;

    @Column(length = 255)
    private String description;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected PlatformWalletTransaction() {
    }

    public PlatformWalletTransaction(
            Long amount,
            String transactionType,
            Long referenceId,
            String idempotencyKey,
            String description
    ) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        this.amount = amount;
        this.transactionType = transactionType;
        this.referenceId = referenceId;
        this.idempotencyKey = idempotencyKey;
        this.description = description;
    }

    @PrePersist
    public void setCreatedAt() {
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getAmount() {
        return amount;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public Long getReferenceId() {
        return referenceId;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public String getDescription() {
        return description;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}