package com.example.demo.service;

import com.example.demo.dto.RegisterRequest;
import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.ReferralSettings;
import com.example.demo.entity.User;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.ReferralSettingsRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class RegistrationService {

    private static final long SIGNUP_BONUS = 1000L;
    private static final short REFERRAL_SETTINGS_ID = 1;

    private final UserRepository userRepository;
    private final PointsTransactionRepository pointsTransactionRepository;
    private final ReferralSettingsRepository referralSettingsRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistrationService(
            UserRepository userRepository,
            PointsTransactionRepository pointsTransactionRepository,
            ReferralSettingsRepository referralSettingsRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.pointsTransactionRepository = pointsTransactionRepository;
        this.referralSettingsRepository = referralSettingsRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void register(RegisterRequest request) {

        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String mobileNumber = request.getMobileNumber().trim();

        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        if (userRepository.findByMobileNumber(mobileNumber).isPresent()) {
            throw new IllegalArgumentException("Mobile number already exists");
        }

        // Load current admin-configured referral settings.
        ReferralSettings referralSettings = referralSettingsRepository
                .findById(REFERRAL_SETTINGS_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "Referral settings not found. Check V4 migration."));

        // Validate referral code, if supplied.
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

        // Generate a unique referral code for the new user.
        String newReferralCode;

        do {
            newReferralCode = "CW" + UUID.randomUUID()
                    .toString()
                    .replace("-", "")
                    .substring(0, 12)
                    .toUpperCase(Locale.ROOT);
        } while (userRepository.findByReferralCode(newReferralCode).isPresent());

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setMobileNumber(mobileNumber);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setReferralCode(newReferralCode);
        user.setReferredByCode(
                referrer == null ? null : referrer.getReferralCode()
        );

        // User entity initializes the balance to 1000 points.
        // Record the signup bonus without crediting it a second time.
        User savedUser = userRepository.save(user);

        pointsTransactionRepository.save(new PointsTransaction(
                savedUser,
                SIGNUP_BONUS,
                "SIGNUP_BONUS",
                "SIGNUP_BONUS_" + savedUser.getId(),
                "Welcome bonus: 1000 virtual points"
        ));

        // Referral rewards apply only when a valid referral was supplied.
        if (referrer != null) {

            long newUserReward = referralSettings.getReferredUserReward();
            long referrerReward = referralSettings.getReferrerReward();

            String newUserRewardKey =
                    "REFERRAL_NEW_USER_" + savedUser.getId();

            String referrerRewardKey =
                    "REFERRAL_REFERRER_" + savedUser.getId();

            // Lock both user rows before updating balances.
            User newUserForUpdate = userRepository
                    .findByIdForUpdate(savedUser.getId())
                    .orElseThrow(() ->
                            new IllegalStateException("New user not found"));

            User referrerForUpdate = userRepository
                    .findByIdForUpdate(referrer.getId())
                    .orElseThrow(() ->
                            new IllegalStateException("Referrer not found"));

            // Credit the new user at most once.
            if (newUserReward > 0
                    && pointsTransactionRepository
                    .findByIdempotencyKey(newUserRewardKey).isEmpty()) {

                newUserForUpdate.setVirtualPoints(
                        Math.addExact(
                                newUserForUpdate.getVirtualPoints(),
                                newUserReward
                        )
                );

                pointsTransactionRepository.save(new PointsTransaction(
                        newUserForUpdate,
                        newUserReward,
                        "REFERRAL_BONUS",
                        newUserRewardKey,
                        "Referral signup reward: "
                                + newUserReward + " virtual points"
                ));
            }

            // Credit the referrer at most once per referred user.
            if (referrerReward > 0
                    && pointsTransactionRepository
                    .findByIdempotencyKey(referrerRewardKey).isEmpty()) {

                referrerForUpdate.setVirtualPoints(
                        Math.addExact(
                                referrerForUpdate.getVirtualPoints(),
                                referrerReward
                        )
                );

                pointsTransactionRepository.save(new PointsTransaction(
                        referrerForUpdate,
                        referrerReward,
                        "REFERRAL_BONUS",
                        referrerRewardKey,
                        "Referral reward: "
                                + referrerReward + " virtual points"
                ));
            }
        }
    }
}