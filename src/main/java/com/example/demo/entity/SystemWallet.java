package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "system_wallets")
public class SystemWallet {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Short id;

    @Column(name = "wallet_type", nullable = false, unique = true, length = 20)
    private String walletType;

    @Column(nullable = false)
    private Long balance;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected SystemWallet() {}

    @PrePersist @PreUpdate
    protected void touch() { updatedAt = OffsetDateTime.now(); }

    public Short getId() { return id; }
    public String getWalletType() { return walletType; }
    public Long getBalance() { return balance; }

    public void credit(long amount) {
        if (amount <= 0) throw new IllegalArgumentException("Credit must be positive");
        this.balance = Math.addExact(this.balance, amount);
    }

    public void debit(long amount) {
        if (amount <= 0 || this.balance < amount)
            throw new IllegalStateException("Platform Wallet has insufficient balance");
        this.balance -= amount;
    }
}