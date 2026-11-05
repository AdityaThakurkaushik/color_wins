package com.example.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "platform_wallet_policy")
public class PlatformWalletPolicy {

    @Id
    private Short id = 1;

    @Column(name = "signup_bonus_enabled", nullable = false)
    private Boolean signupBonusEnabled = true;

    @Column(name = "signup_bonus_amount", nullable = false)
    private Long signupBonusAmount = 100L;

    @Column(name = "first_withdrawal_check_enabled", nullable = false)
    private Boolean firstWithdrawalCheckEnabled = true;

    @Column(name = "first_withdrawal_min_deposits", nullable = false)
    private Long firstWithdrawalMinDeposits = 100L;

    @Column(name = "min_withdrawal_enabled", nullable = false)
    private Boolean minWithdrawalEnabled = true;

    @Column(name = "min_withdrawal_amount", nullable = false)
    private Long minWithdrawalAmount = 200L;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public PlatformWalletPolicy() {
    }

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public Short getId() {
        return id;
    }

    public Boolean getSignupBonusEnabled() {
        return signupBonusEnabled;
    }

    public void setSignupBonusEnabled(Boolean signupBonusEnabled) {
        this.signupBonusEnabled = signupBonusEnabled;
    }

    public Long getSignupBonusAmount() {
        return signupBonusAmount;
    }

    public void setSignupBonusAmount(Long signupBonusAmount) {
        this.signupBonusAmount = signupBonusAmount;
    }

    public Boolean getFirstWithdrawalCheckEnabled() {
        return firstWithdrawalCheckEnabled;
    }

    public void setFirstWithdrawalCheckEnabled(Boolean firstWithdrawalCheckEnabled) {
        this.firstWithdrawalCheckEnabled = firstWithdrawalCheckEnabled;
    }

    public Long getFirstWithdrawalMinDeposits() {
        return firstWithdrawalMinDeposits;
    }

    public void setFirstWithdrawalMinDeposits(Long firstWithdrawalMinDeposits) {
        this.firstWithdrawalMinDeposits = firstWithdrawalMinDeposits;
    }

    public Boolean getMinWithdrawalEnabled() {
        return minWithdrawalEnabled;
    }

    public void setMinWithdrawalEnabled(Boolean minWithdrawalEnabled) {
        this.minWithdrawalEnabled = minWithdrawalEnabled;
    }

    public Long getMinWithdrawalAmount() {
        return minWithdrawalAmount;
    }

    public void setMinWithdrawalAmount(Long minWithdrawalAmount) {
        this.minWithdrawalAmount = minWithdrawalAmount;
    }
}
