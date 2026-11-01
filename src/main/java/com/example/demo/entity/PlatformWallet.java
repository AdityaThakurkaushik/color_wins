package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "platform_wallet")
public class PlatformWallet {

    @Id
    private Short id = 1;

    @Column(nullable = false)
    private Long balance = 0L;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void updateTimestamp() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Short getId() {
        return id;
    }

    public Long getBalance() {
        return balance;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void credit(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        this.balance = Math.addExact(this.balance, amount);
    }

    public void debit(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        if (this.balance < amount) {
            throw new IllegalStateException("Insufficient platform wallet balance");
        }
        this.balance -= amount;
    }
}