
package com.example.demo.service;

import com.example.demo.dto.RegisterRequest;
import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.User;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class RegistrationService {

    private static final long SIGNUP_BONUS = 1000L;
    private static final long REFERRER_REWARD = 20L;
    private static final long REFERRED_USER_REWARD = 10L;

    private final UserRepository userRepository;
    private final PointsTransactionRepository pointsTransactionRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistrationService(
            UserRepository userRepository,
            PointsTransactionRepository pointsTransactionRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.pointsTransactionRepository = pointsTransactionRepository;
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

        // Validate referral code, if supplied.
        User referrer = null;
        String submittedCode = request.getReferralCode();

        if (submittedCode != null && !submittedCode.isBlank()) {
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

        // User starts with 1000 points from the User entity default.
        // Record the signup bonus without adding those points a second time.
        User savedUser = userRepository.save(user);

        pointsTransactionRepository.save(new PointsTransaction(
                savedUser,
                SIGNUP_BONUS,
                "SIGNUP_BONUS",
                "SIGNUP_BONUS_" + savedUser.getId(),
                "Welcome bonus: 1000 virtual points"
        ));

        // Apply referral rewards only when a valid referral was used.
        if (referrer != null) {

            String newUserRewardKey =
                    "REFERRAL_NEW_USER_" + savedUser.getId();

            String referrerRewardKey =
                    "REFERRAL_REFERRER_" + savedUser.getId();

            // Lock the new user's row before changing the balance.
            User newUserForUpdate = userRepository
                    .findByIdForUpdate(savedUser.getId())
                    .orElseThrow(() ->
                            new IllegalStateException("New user not found"));

            // Lock the referrer's row to avoid concurrent balance updates.
            User referrerForUpdate = userRepository
                    .findByIdForUpdate(referrer.getId())
                    .orElseThrow(() ->
                            new IllegalStateException("Referrer not found"));

            // Credit the new user an additional 10 points, once.
            if (pointsTransactionRepository
                    .findByIdempotencyKey(newUserRewardKey).isEmpty()) {

                newUserForUpdate.setVirtualPoints(
                        newUserForUpdate.getVirtualPoints()
                                + REFERRED_USER_REWARD
                );

                pointsTransactionRepository.save(new PointsTransaction(
                        newUserForUpdate,
                        REFERRED_USER_REWARD,
                        "REFERRAL_BONUS",
                        newUserRewardKey,
                        "Referral signup reward: 10 virtual points"
                ));
            }

            // Credit the referrer 20 points, once.
            if (pointsTransactionRepository
                    .findByIdempotencyKey(referrerRewardKey).isEmpty()) {

                referrerForUpdate.setVirtualPoints(
                        referrerForUpdate.getVirtualPoints()
                                + REFERRER_REWARD
                );

                pointsTransactionRepository.save(new PointsTransaction(
                        referrerForUpdate,
                        REFERRER_REWARD,
                        "REFERRAL_BONUS",
                        referrerRewardKey,
                        "Referral reward: 20 virtual points"
                ));
            }
        }
    }
}
