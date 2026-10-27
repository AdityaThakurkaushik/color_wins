
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

        // Validate optional referral code.
        String referredByCode = null;
        String submittedCode = request.getReferralCode();

        if (submittedCode != null && !submittedCode.isBlank()) {
            submittedCode = submittedCode.trim().toUpperCase(Locale.ROOT);

            User referrer = userRepository.findByReferralCode(submittedCode)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Invalid referral code"));

            referredByCode = referrer.getReferralCode();
        }

        // Generate a unique referral code for this user.
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
        user.setReferredByCode(referredByCode);

        User savedUser = userRepository.save(user);

        // Preserve the existing signup bonus.
        PointsTransaction signupBonus = new PointsTransaction(
                savedUser,
                SIGNUP_BONUS,
                "SIGNUP_BONUS",
                "SIGNUP_BONUS_" + UUID.randomUUID(),
                "Welcome bonus: 1000 virtual points"
        );

        pointsTransactionRepository.save(signupBonus);
    }
}
