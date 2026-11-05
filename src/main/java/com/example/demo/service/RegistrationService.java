package com.example.demo.service;

import com.example.demo.dto.RegisterRequest;
import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.ReferralSettings;
import com.example.demo.entity.User;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.ReferralSettingsRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.telegram.TelegramAuthService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class RegistrationService {

    private static final short REFERRAL_SETTINGS_ID = 1;

    private final UserRepository userRepository;
    private final PointsTransactionRepository pointsTransactionRepository;
    private final ReferralSettingsRepository referralSettingsRepository;
    private final WalletPolicyService walletPolicyService;
    private final PasswordEncoder passwordEncoder;
    private final EmailOtpService emailOtpService;
    private final TelegramAuthService telegramAuthService;

    public RegistrationService(
            UserRepository userRepository,
            PointsTransactionRepository pointsTransactionRepository,
            ReferralSettingsRepository referralSettingsRepository,
            WalletPolicyService walletPolicyService,
            PasswordEncoder passwordEncoder,
            EmailOtpService emailOtpService,
            TelegramAuthService telegramAuthService) {
        this.userRepository = userRepository;
        this.pointsTransactionRepository = pointsTransactionRepository;
        this.referralSettingsRepository = referralSettingsRepository;
        this.walletPolicyService = walletPolicyService;
        this.passwordEncoder = passwordEncoder;
        this.emailOtpService = emailOtpService;
        this.telegramAuthService = telegramAuthService;
    }

    public record RegisterResult(String telegramDeepLink, String botUsername) {}

    public record ForgotResult(String telegramDeepLink, String botUsername) {}

    @Transactional
    public RegisterResult register(RegisterRequest request) {
        String name = request.getName().trim();
        String state = request.getState().trim();
        String email = EmailOtpService.normalize(request.getEmail());
        String mobileNumber = request.getMobileNumber().trim();
        short age = request.getAge().shortValue();

        EmailOtpService.requireGmail(email);

        User existing = userRepository.findByEmail(email).orElse(null);
        if (existing != null && existing.isEmailVerified()) {
            throw new IllegalArgumentException("Email already exists");
        }

        User mobileOwner = userRepository.findByMobileNumber(mobileNumber).orElse(null);
        if (mobileOwner != null
                && (existing == null || !mobileOwner.getId().equals(existing.getId()))) {
            throw new IllegalArgumentException("Mobile number already exists");
        }

        ReferralSettings referralSettings = referralSettingsRepository
                .findById(REFERRAL_SETTINGS_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "Referral settings not found. Check V4 migration."));

        User referrer = null;
        String submittedCode = request.getReferralCode();
        if (submittedCode != null && !submittedCode.isBlank()) {
            if (!Boolean.TRUE.equals(referralSettings.getEnabled())) {
                throw new IllegalArgumentException(
                        "Referral program is currently disabled");
            }
            submittedCode = submittedCode.trim().toUpperCase(Locale.ROOT);
            referrer = userRepository.findByReferralCode(submittedCode)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Invalid referral code"));
        }

        User user = existing != null ? existing : new User();
        if (existing == null) {
            user.setUsername(generateUsername(name, email));
            String newReferralCode;
            do {
                newReferralCode = "CW" + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 12)
                        .toUpperCase(Locale.ROOT);
            } while (userRepository.findByReferralCode(newReferralCode).isPresent());
            user.setReferralCode(newReferralCode);
            user.setVirtualPoints(0L);
        }

        user.setDisplayName(name);
        user.setState(state);
        user.setAge(age);
        user.setEmail(email);
        user.setMobileNumber(mobileNumber);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmailVerified(false);
        user.setActive(false);
        user.setReferredByCode(referrer == null ? null : referrer.getReferralCode());

        userRepository.save(user);

        if (!telegramAuthService.available()) {
            return new RegisterResult(null, null);
        }

        String deepLink = telegramAuthService.createVerifyLink(user);
        return new RegisterResult(deepLink, telegramAuthService.botUsername());
    }

    @Transactional
    public void verifyEmail(String rawEmail, String code) {
        String email = EmailOtpService.normalize(rawEmail);
        emailOtpService.consume(email, EmailOtpService.PURPOSE_VERIFY, code);
        completeEmailVerification(email);
    }

    @Transactional
    public void completeEmailVerification(String rawEmail) {
        String email = EmailOtpService.normalize(rawEmail);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        if (user.isEmailVerified() && user.isActive()) {
            return;
        }

        user.setEmailVerified(true);
        user.setActive(true);
        userRepository.save(user);

        creditSignupBonusOnce(user);
        creditReferralRewards(user);
    }

    @Transactional(readOnly = true)
    public boolean isVerified(String rawEmail) {
        String email = EmailOtpService.normalize(rawEmail);
        return userRepository.findByEmail(email)
                .map(user -> user.isEmailVerified() && user.isActive())
                .orElse(false);
    }

    @Transactional
    public RegisterResult resendVerification(String rawEmail) {
        String email = EmailOtpService.normalize(rawEmail);
        EmailOtpService.requireGmail(email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Account is already verified. Please log in");
        }
        if (!telegramAuthService.available()) {
            throw new IllegalArgumentException("Telegram bot is not configured");
        }
        String deepLink = telegramAuthService.createVerifyLink(user);
        return new RegisterResult(deepLink, telegramAuthService.botUsername());
    }

    @Transactional
    public ForgotResult forgotPassword(String rawEmail) {
        String email = EmailOtpService.normalize(rawEmail);
        EmailOtpService.requireGmail(email);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !user.isEmailVerified()) {
            return new ForgotResult(null, null);
        }
        if (!telegramAuthService.available()) {
            throw new IllegalArgumentException("Telegram bot is not configured");
        }
        String deepLink = telegramAuthService.createResetLink(user);
        return new ForgotResult(deepLink, telegramAuthService.botUsername());
    }

    @Transactional
    public void resetPassword(String rawEmail, String code, String newPassword) {
        if (newPassword == null || newPassword.length() < 8 || newPassword.length() > 72) {
            throw new IllegalArgumentException("Password must be 8 to 72 characters");
        }
        String email = EmailOtpService.normalize(rawEmail);
        emailOtpService.consume(email, EmailOtpService.PURPOSE_RESET, code);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!user.isEmailVerified()) {
            throw new IllegalArgumentException("Verify your Telegram first");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private void creditReferralRewards(User savedUser) {
        if (savedUser.getReferredByCode() == null || savedUser.getReferredByCode().isBlank()) {
            return;
        }

        ReferralSettings referralSettings = referralSettingsRepository
                .findById(REFERRAL_SETTINGS_ID)
                .orElse(null);
        if (referralSettings == null || !Boolean.TRUE.equals(referralSettings.getEnabled())) {
            return;
        }

        User referrer = userRepository.findByReferralCode(savedUser.getReferredByCode())
                .orElse(null);
        if (referrer == null) {
            return;
        }

        long newUserReward = referralSettings.getReferredUserReward();
        long referrerReward = referralSettings.getReferrerReward();

        String newUserRewardKey = "REFERRAL_NEW_USER_" + savedUser.getId();
        String referrerRewardKey = "REFERRAL_REFERRER_" + savedUser.getId();

        User newUserForUpdate = userRepository
                .findByIdForUpdate(savedUser.getId())
                .orElseThrow(() -> new IllegalStateException("New user not found"));
        User referrerForUpdate = userRepository
                .findByIdForUpdate(referrer.getId())
                .orElseThrow(() -> new IllegalStateException("Referrer not found"));

        if (newUserReward > 0
                && pointsTransactionRepository.findByIdempotencyKey(newUserRewardKey).isEmpty()) {
            newUserForUpdate.setVirtualPoints(
                    Math.addExact(newUserForUpdate.getVirtualPoints(), newUserReward));
            pointsTransactionRepository.save(new PointsTransaction(
                    newUserForUpdate,
                    newUserReward,
                    "REFERRAL_BONUS",
                    newUserRewardKey,
                    "Referral signup reward: " + newUserReward + " virtual points"
            ));
        }

        if (referrerReward > 0
                && pointsTransactionRepository.findByIdempotencyKey(referrerRewardKey).isEmpty()) {
            referrerForUpdate.setVirtualPoints(
                    Math.addExact(referrerForUpdate.getVirtualPoints(), referrerReward));
            pointsTransactionRepository.save(new PointsTransaction(
                    referrerForUpdate,
                    referrerReward,
                    "REFERRAL_BONUS",
                    referrerRewardKey,
                    "Referral reward: " + referrerReward + " virtual points"
            ));
        }
    }

    private void creditSignupBonusOnce(User savedUser) {
        WalletPolicyService.ResolvedPolicy policy = walletPolicyService.resolve(savedUser.getId());
        if (!policy.signupBonusEnabled() || policy.signupBonusAmount() <= 0) {
            return;
        }
        String key = "SIGNUP_BONUS_" + savedUser.getId();
        if (pointsTransactionRepository.findByIdempotencyKey(key).isPresent()) {
            return;
        }
        User locked = userRepository.findByIdForUpdate(savedUser.getId())
                .orElseThrow(() -> new IllegalStateException("New user not found"));
        if (pointsTransactionRepository.findByIdempotencyKey(key).isPresent()) {
            return;
        }
        locked.setVirtualPoints(Math.addExact(locked.getVirtualPoints(), policy.signupBonusAmount()));
        pointsTransactionRepository.save(new PointsTransaction(
                locked,
                policy.signupBonusAmount(),
                "SIGNUP_BONUS",
                key,
                "Welcome bonus: " + policy.signupBonusAmount() + " virtual points"
        ));
    }

    private String generateUsername(String name, String email) {
        String base = name.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
        if (base.length() < 3) {
            String local = email.substring(0, email.indexOf('@'))
                    .replaceAll("[^a-z0-9]", "");
            base = local.length() >= 3 ? local : ("user" + local);
        }
        if (base.length() > 20) {
            base = base.substring(0, 20);
        }
        String candidate = base;
        int guard = 0;
        while (userRepository.findByUsername(candidate).isPresent()) {
            String suffix = String.valueOf(1000 + (Math.abs(UUID.randomUUID().hashCode()) % 9000));
            candidate = base.substring(0, Math.min(base.length(), 24)) + suffix;
            if (++guard > 20) {
                candidate = "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
                break;
            }
        }
        return candidate;
    }
}
