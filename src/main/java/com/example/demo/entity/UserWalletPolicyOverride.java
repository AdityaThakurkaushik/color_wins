package com.example.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "user_wallet_policy_override")
public class UserWalletPolicyOverride {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "signup_bonus_enabled")
    private Boolean signupBonusEnabled;

    @Column(name = "signup_bonus_amount")
    private Long signupBonusAmount;

    @Column(name = "first_withdrawal_check_enabled")
    private Boolean firstWithdrawalCheckEnabled;

    @Column(name = "first_withdrawal_min_deposits")
    private Long firstWithdrawalMinDeposits;

    @Column(name = "min_withdrawal_enabled")
    private Boolean minWithdrawalEnabled;

    @Column(name = "min_withdrawal_amount")
    private Long minWithdrawalAmount;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected UserWalletPolicyOverride() {
    }

    public UserWalletPolicyOverride(User user) {
        this.user = user;
    }

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getUserId() {
        return userId;
    }

    public User getUser() {
        return user;
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
