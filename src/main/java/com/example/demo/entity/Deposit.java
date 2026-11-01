package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "deposits")
public class Deposit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, length = 20)
    private String publicId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_method_id", nullable = false)
    private PaymentMethod paymentMethod;

    @Column(name = "amount_requested", nullable = false)
    private Long amountRequested;

    @Column(name = "amount_confirmed")
    private Long amountConfirmed;

    @Column(length = 22, unique = true)
    private String utr;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Deposit() {
    }

    public Deposit(String publicId, User user, PaymentMethod paymentMethod, long amountRequested, OffsetDateTime expiresAt) {
        this.publicId = publicId;
        this.user = user;
        this.paymentMethod = paymentMethod;
        this.amountRequested = amountRequested;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getPublicId() { return publicId; }
    public User getUser() { return user; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public Long getAmountRequested() { return amountRequested; }
    public Long getAmountConfirmed() { return amountConfirmed; }
    public String getUtr() { return utr; }
    public String getStatus() { return status; }
    public String getRejectReason() { return rejectReason; }
    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public void clearUtr() {
        this.utr = null;
    }

    public void submitUtr(String utr) {
        this.utr = utr;
        this.status = "SUBMITTED";
        this.submittedAt = OffsetDateTime.now();
    }

    public void approve(long amountConfirmed) {
        this.amountConfirmed = amountConfirmed;
        this.status = "APPROVED";
        this.approvedAt = OffsetDateTime.now();
    }

    public void reject(String reason) {
        this.status = "REJECTED";
        this.rejectReason = reason;
    }

    public void expire() {
        this.status = "EXPIRED";
    }
}
