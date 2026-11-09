package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "referral_agent_withdrawals")
public class ReferralAgentWithdrawal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agent_id", nullable = false)
    private ReferralAgent agent;

    @Column(nullable = false)
    private Long amount;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "payout_method", nullable = false, length = 20)
    private String payoutMethod;

    @Column(name = "account_holder_name", nullable = false, length = 100)
    private String accountHolderName;

    @Column(name = "upi_id", length = 100)
    private String upiId;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account_number", length = 34)
    private String bankAccountNumber;

    @Column(name = "bank_ifsc", length = 20)
    private String bankIfsc;

    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    protected ReferralAgentWithdrawal() {
    }

    public ReferralAgentWithdrawal(
            ReferralAgent agent,
            long amount,
            String payoutMethod,
            String accountHolderName,
            String upiId,
            String bankName,
            String bankAccountNumber,
            String bankIfsc) {
        this.agent = agent;
        this.amount = amount;
        this.payoutMethod = payoutMethod;
        this.accountHolderName = accountHolderName;
        this.upiId = upiId;
        this.bankName = bankName;
        this.bankAccountNumber = bankAccountNumber;
        this.bankIfsc = bankIfsc;
        this.status = "PENDING";
    }

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public void markPaid() {
        this.status = "PAID";
        this.resolvedAt = OffsetDateTime.now();
        this.rejectReason = null;
    }

    public void reject(String reason) {
        this.status = "REJECTED";
        this.rejectReason = reason;
        this.resolvedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public ReferralAgent getAgent() {
        return agent;
    }

    public Long getAmount() {
        return amount;
    }

    public String getStatus() {
        return status;
    }

    public String getPayoutMethod() {
        return payoutMethod;
    }

    public String getAccountHolderName() {
        return accountHolderName;
    }

    public String getUpiId() {
        return upiId;
    }

    public String getBankName() {
        return bankName;
    }

    public String getBankAccountNumber() {
        return bankAccountNumber;
    }

    public String getBankIfsc() {
        return bankIfsc;
    }

    public String getRejectReason() {
        return rejectReason;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getResolvedAt() {
        return resolvedAt;
    }
}
