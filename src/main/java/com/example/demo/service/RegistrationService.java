
package com.example.demo.service;

import com.example.demo.dto.RegisterRequest;
import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.User;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        String email = request.getEmail().trim().toLowerCase();
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

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setMobileNumber(mobileNumber);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        User savedUser = userRepository.save(user);

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
