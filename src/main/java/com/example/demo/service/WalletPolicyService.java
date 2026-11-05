package com.example.demo.service;

import com.example.demo.entity.PlatformWalletPolicy;
import com.example.demo.entity.PlatformWalletPolicyAudit;
import com.example.demo.entity.User;
import com.example.demo.entity.UserWalletPolicyOverride;
import com.example.demo.repository.DepositRepository;
import com.example.demo.repository.PlatformWalletPolicyAuditRepository;
import com.example.demo.repository.PlatformWalletPolicyRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.UserWalletPolicyOverrideRepository;
import com.example.demo.repository.WithdrawalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class WalletPolicyService {

    public static final String FIRST_WITHDRAWAL_BLOCK_PREFIX =
            "You must deposit at least ₹";
    public static final String FIRST_WITHDRAWAL_BLOCK_SUFFIX =
            " to become eligible for your first withdrawal.";

    private static final short POLICY_ID = 1;
    private static final long MAX_SETTING = 1_000_000L;

    private final PlatformWalletPolicyRepository policyRepository;
    private final UserWalletPolicyOverrideRepository overrideRepository;
    private final PlatformWalletPolicyAuditRepository auditRepository;
    private final UserRepository userRepository;
    private final DepositRepository depositRepository;
    private final WithdrawalRepository withdrawalRepository;

    public WalletPolicyService(
            PlatformWalletPolicyRepository policyRepository,
            UserWalletPolicyOverrideRepository overrideRepository,
            PlatformWalletPolicyAuditRepository auditRepository,
            UserRepository userRepository,
            DepositRepository depositRepository,
            WithdrawalRepository withdrawalRepository) {
        this.policyRepository = policyRepository;
        this.overrideRepository = overrideRepository;
        this.auditRepository = auditRepository;
        this.userRepository = userRepository;
        this.depositRepository = depositRepository;
        this.withdrawalRepository = withdrawalRepository;
    }

    public record ResolvedPolicy(
            boolean signupBonusEnabled,
            long signupBonusAmount,
            boolean firstWithdrawalCheckEnabled,
            long firstWithdrawalMinDeposits,
            boolean minWithdrawalEnabled,
            long minWithdrawalAmount
    ) {
        public String firstWithdrawalBlockMessage() {
            return FIRST_WITHDRAWAL_BLOCK_PREFIX
                    + firstWithdrawalMinDeposits
                    + FIRST_WITHDRAWAL_BLOCK_SUFFIX;
        }
    }

    @Transactional(readOnly = true)
    public ResolvedPolicy resolve(Long userId) {
        PlatformWalletPolicy global = requiredGlobal();
        UserWalletPolicyOverride override = userId == null
                ? null
                : overrideRepository.findById(userId).orElse(null);
        return merge(global, override);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> globalView() {
        return toMap(resolve(null), null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> userView(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean hasOverride = overrideRepository.existsById(userId);
        Map<String, Object> body = toMap(resolve(userId), userId);
        body.put("username", user.getUsername());
        body.put("hasOverride", hasOverride);
        return body;
    }

    @Transactional(readOnly = true)
    public List<PlatformWalletPolicyAudit> recentAudit() {
        return auditRepository.findTop50ByOrderByCreatedAtDesc();
    }

    @Transactional
    public Map<String, Object> updateGlobal(String actor, PolicyUpdate update) {
        PlatformWalletPolicy policy = policyRepository.findByIdForUpdate(POLICY_ID)
                .orElseThrow(() -> new IllegalStateException("Wallet policy not initialized"));
        applyGlobal(actor, policy, update);
        return toMap(merge(policy, null), null);
    }

    @Transactional
    public Map<String, Object> updateUserOverride(String actor, Long userId, PolicyUpdate update) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        UserWalletPolicyOverride override = overrideRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> overrideRepository.save(new UserWalletPolicyOverride(user)));
        applyOverride(actor, userId, override, update);
        return userView(userId);
    }

    @Transactional
    public Map<String, Object> clearUserOverride(String actor, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        overrideRepository.findById(userId).ifPresent(existing -> {
            audit(actor, userId, "override", "present", "cleared");
            overrideRepository.delete(existing);
        });
        Map<String, Object> body = toMap(resolve(userId), userId);
        body.put("username", user.getUsername());
        body.put("hasOverride", false);
        return body;
    }

    public void enforceFirstWithdrawal(Long userId, ResolvedPolicy policy) {
        if (!policy.firstWithdrawalCheckEnabled()) {
            return;
        }
        if (withdrawalRepository.existsByUserIdAndStatus(userId, "PAID")) {
            return;
        }
        long approved = depositRepository.sumApprovedDeposits(userId);
        if (approved < policy.firstWithdrawalMinDeposits()) {
            throw new IllegalArgumentException(policy.firstWithdrawalBlockMessage());
        }
    }

    public static long requirePositiveAmount(Long amount, String field) {
        if (amount == null || amount < 0 || amount > MAX_SETTING) {
            throw new IllegalArgumentException(field + " must be between 0 and " + MAX_SETTING);
        }
        return amount;
    }

    private void applyGlobal(String actor, PlatformWalletPolicy policy, PolicyUpdate update) {
        if (update.signupBonusEnabled() != null
                && !Objects.equals(policy.getSignupBonusEnabled(), update.signupBonusEnabled())) {
            audit(actor, null, "signup_bonus_enabled",
                    String.valueOf(policy.getSignupBonusEnabled()),
                    String.valueOf(update.signupBonusEnabled()));
            policy.setSignupBonusEnabled(update.signupBonusEnabled());
        }
        if (update.signupBonusAmount() != null
                && !Objects.equals(policy.getSignupBonusAmount(), update.signupBonusAmount())) {
            long value = requirePositiveAmount(update.signupBonusAmount(), "Signup bonus amount");
            audit(actor, null, "signup_bonus_amount",
                    String.valueOf(policy.getSignupBonusAmount()),
                    String.valueOf(value));
            policy.setSignupBonusAmount(value);
        }
        if (update.firstWithdrawalCheckEnabled() != null
                && !Objects.equals(policy.getFirstWithdrawalCheckEnabled(), update.firstWithdrawalCheckEnabled())) {
            audit(actor, null, "first_withdrawal_check_enabled",
                    String.valueOf(policy.getFirstWithdrawalCheckEnabled()),
                    String.valueOf(update.firstWithdrawalCheckEnabled()));
            policy.setFirstWithdrawalCheckEnabled(update.firstWithdrawalCheckEnabled());
        }
        if (update.firstWithdrawalMinDeposits() != null
                && !Objects.equals(policy.getFirstWithdrawalMinDeposits(), update.firstWithdrawalMinDeposits())) {
            long value = requirePositiveAmount(update.firstWithdrawalMinDeposits(), "First withdrawal deposit requirement");
            audit(actor, null, "first_withdrawal_min_deposits",
                    String.valueOf(policy.getFirstWithdrawalMinDeposits()),
                    String.valueOf(value));
            policy.setFirstWithdrawalMinDeposits(value);
        }
        if (update.minWithdrawalEnabled() != null
                && !Objects.equals(policy.getMinWithdrawalEnabled(), update.minWithdrawalEnabled())) {
            audit(actor, null, "min_withdrawal_enabled",
                    String.valueOf(policy.getMinWithdrawalEnabled()),
                    String.valueOf(update.minWithdrawalEnabled()));
            policy.setMinWithdrawalEnabled(update.minWithdrawalEnabled());
        }
        if (update.minWithdrawalAmount() != null
                && !Objects.equals(policy.getMinWithdrawalAmount(), update.minWithdrawalAmount())) {
            long value = requirePositiveAmount(update.minWithdrawalAmount(), "Minimum withdrawal amount");
            audit(actor, null, "min_withdrawal_amount",
                    String.valueOf(policy.getMinWithdrawalAmount()),
                    String.valueOf(value));
            policy.setMinWithdrawalAmount(value);
        }
    }

    private void applyOverride(String actor, Long userId, UserWalletPolicyOverride override, PolicyUpdate update) {
        if (update.clearSignupBonus()) {
            audit(actor, userId, "signup_bonus_override", String.valueOf(override.getSignupBonusAmount()), "inherit");
            override.setSignupBonusEnabled(null);
            override.setSignupBonusAmount(null);
        } else {
            if (update.signupBonusEnabled() != null) {
                audit(actor, userId, "signup_bonus_enabled",
                        String.valueOf(override.getSignupBonusEnabled()),
                        String.valueOf(update.signupBonusEnabled()));
                override.setSignupBonusEnabled(update.signupBonusEnabled());
            }
            if (update.signupBonusAmount() != null) {
                long value = requirePositiveAmount(update.signupBonusAmount(), "Signup bonus amount");
                audit(actor, userId, "signup_bonus_amount",
                        String.valueOf(override.getSignupBonusAmount()),
                        String.valueOf(value));
                override.setSignupBonusAmount(value);
            }
        }
        if (update.clearFirstWithdrawal()) {
            audit(actor, userId, "first_withdrawal_override", String.valueOf(override.getFirstWithdrawalMinDeposits()), "inherit");
            override.setFirstWithdrawalCheckEnabled(null);
            override.setFirstWithdrawalMinDeposits(null);
        } else {
            if (update.firstWithdrawalCheckEnabled() != null) {
                audit(actor, userId, "first_withdrawal_check_enabled",
                        String.valueOf(override.getFirstWithdrawalCheckEnabled()),
                        String.valueOf(update.firstWithdrawalCheckEnabled()));
                override.setFirstWithdrawalCheckEnabled(update.firstWithdrawalCheckEnabled());
            }
            if (update.firstWithdrawalMinDeposits() != null) {
                long value = requirePositiveAmount(update.firstWithdrawalMinDeposits(), "First withdrawal deposit requirement");
                audit(actor, userId, "first_withdrawal_min_deposits",
                        String.valueOf(override.getFirstWithdrawalMinDeposits()),
                        String.valueOf(value));
                override.setFirstWithdrawalMinDeposits(value);
            }
        }
        if (update.clearMinWithdrawal()) {
            audit(actor, userId, "min_withdrawal_override", String.valueOf(override.getMinWithdrawalAmount()), "inherit");
            override.setMinWithdrawalEnabled(null);
            override.setMinWithdrawalAmount(null);
        } else {
            if (update.minWithdrawalEnabled() != null) {
                audit(actor, userId, "min_withdrawal_enabled",
                        String.valueOf(override.getMinWithdrawalEnabled()),
                        String.valueOf(update.minWithdrawalEnabled()));
                override.setMinWithdrawalEnabled(update.minWithdrawalEnabled());
            }
            if (update.minWithdrawalAmount() != null) {
                long value = requirePositiveAmount(update.minWithdrawalAmount(), "Minimum withdrawal amount");
                audit(actor, userId, "min_withdrawal_amount",
                        String.valueOf(override.getMinWithdrawalAmount()),
                        String.valueOf(value));
                override.setMinWithdrawalAmount(value);
            }
        }
    }

    private ResolvedPolicy merge(PlatformWalletPolicy global, UserWalletPolicyOverride override) {
        boolean signupEnabled = global.getSignupBonusEnabled();
        long signupAmount = global.getSignupBonusAmount();
        boolean firstEnabled = global.getFirstWithdrawalCheckEnabled();
        long firstMin = global.getFirstWithdrawalMinDeposits();
        boolean minEnabled = global.getMinWithdrawalEnabled();
        long minAmount = global.getMinWithdrawalAmount();
        if (override != null) {
            if (override.getSignupBonusEnabled() != null) {
                signupEnabled = override.getSignupBonusEnabled();
            }
            if (override.getSignupBonusAmount() != null) {
                signupAmount = override.getSignupBonusAmount();
            }
            if (override.getFirstWithdrawalCheckEnabled() != null) {
                firstEnabled = override.getFirstWithdrawalCheckEnabled();
            }
            if (override.getFirstWithdrawalMinDeposits() != null) {
                firstMin = override.getFirstWithdrawalMinDeposits();
            }
            if (override.getMinWithdrawalEnabled() != null) {
                minEnabled = override.getMinWithdrawalEnabled();
            }
            if (override.getMinWithdrawalAmount() != null) {
                minAmount = override.getMinWithdrawalAmount();
            }
        }
        return new ResolvedPolicy(signupEnabled, signupAmount, firstEnabled, firstMin, minEnabled, minAmount);
    }

    private PlatformWalletPolicy requiredGlobal() {
        return policyRepository.findById(POLICY_ID)
                .orElseThrow(() -> new IllegalStateException("Wallet policy not initialized"));
    }

    private void audit(String actor, Long userId, String key, String oldValue, String newValue) {
        String who = actor == null || actor.isBlank() ? "admin" : actor;
        auditRepository.save(new PlatformWalletPolicyAudit(who, userId, key, oldValue, newValue));
    }

    private Map<String, Object> toMap(ResolvedPolicy policy, Long userId) {
        Map<String, Object> body = new LinkedHashMap<>();
        if (userId != null) {
            body.put("userId", userId);
        }
        body.put("signupBonusEnabled", policy.signupBonusEnabled());
        body.put("signupBonusAmount", policy.signupBonusAmount());
        body.put("firstWithdrawalCheckEnabled", policy.firstWithdrawalCheckEnabled());
        body.put("firstWithdrawalMinDeposits", policy.firstWithdrawalMinDeposits());
        body.put("minWithdrawalEnabled", policy.minWithdrawalEnabled());
        body.put("minWithdrawalAmount", policy.minWithdrawalAmount());
        return body;
    }

    public record PolicyUpdate(
            Boolean signupBonusEnabled,
            Long signupBonusAmount,
            Boolean firstWithdrawalCheckEnabled,
            Long firstWithdrawalMinDeposits,
            Boolean minWithdrawalEnabled,
            Long minWithdrawalAmount,
            boolean clearSignupBonus,
            boolean clearFirstWithdrawal,
            boolean clearMinWithdrawal
    ) {
    }
}
