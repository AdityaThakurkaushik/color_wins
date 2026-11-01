package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "withdrawals")
public class Withdrawal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, length = 20)
    private String publicId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Long amount;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Withdrawal() {
    }

    public Withdrawal(String publicId, User user, long amount) {
        this.publicId = publicId;
        this.user = user;
        this.amount = amount;
    }

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getPublicId() { return publicId; }
    public User getUser() { return user; }
    public Long getAmount() { return amount; }
    public String getStatus() { return status; }
    public String getRejectReason() { return rejectReason; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public void markPaid() {
        this.status = "PAID";
    }

    public void reject(String reason) {
        this.status = "REJECTED";
        this.rejectReason = reason;
    }
}
