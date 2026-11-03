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

    @Column(name = "payout_method", length = 10)
    private String payoutMethod;

    @Column(name = "account_holder_name", length = 100)
    private String accountHolderName;

    @Column(name = "upi_id", length = 100)
    private String upiId;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account_number", length = 34)
    private String bankAccountNumber;

    @Column(name = "bank_ifsc", length = 11)
    private String bankIfsc;

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
        this(publicId, user, amount, null, null, null, null, null, null);
    }

    public Withdrawal(String publicId, User user, long amount, String payoutMethod,
                      String accountHolderName, String upiId, String bankName,
                      String bankAccountNumber, String bankIfsc) {
        this.publicId = publicId;
        this.user = user;
        this.amount = amount;
        this.payoutMethod = payoutMethod;
        this.accountHolderName = accountHolderName;
        this.upiId = upiId;
        this.bankName = bankName;
        this.bankAccountNumber = bankAccountNumber;
        this.bankIfsc = bankIfsc;
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
    public String getPayoutMethod() { return payoutMethod; }
    public String getAccountHolderName() { return accountHolderName; }
    public String getUpiId() { return upiId; }
    public String getBankName() { return bankName; }
    public String getBankAccountNumber() { return bankAccountNumber; }
    public String getBankIfsc() { return bankIfsc; }
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
