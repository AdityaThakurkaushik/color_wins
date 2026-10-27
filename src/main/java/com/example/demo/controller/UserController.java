package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserRepository userRepository;
    private final PointsTransactionRepository pointsTransactionRepository;

    public UserController(
            UserRepository userRepository,
            PointsTransactionRepository pointsTransactionRepository) {
        this.userRepository = userRepository;
        this.pointsTransactionRepository = pointsTransactionRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {

        String username = authentication.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "virtualPoints", user.getVirtualPoints(),
                "role", user.getRole(),
                "referralCode", user.getReferralCode() == null
                        ? ""
                        : user.getReferralCode()
        ));
    }

    @GetMapping("/referral-stats")
    public ResponseEntity<?> getReferralStats(
            Authentication authentication) {

        String username = authentication.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        String referralCode = user.getReferralCode();

        long totalReferrals = referralCode == null
                ? 0
                : userRepository.countByReferredByCode(referralCode);

        Long earnedCoins = pointsTransactionRepository
                .sumReferralRewardsByUserId(user.getId());

        if (earnedCoins == null) {
            earnedCoins = 0L;
        }

        return ResponseEntity.ok(Map.of(
                "totalReferrals", totalReferrals,
                "successful", totalReferrals,
                "pending", 0L,
                "totalEarnedCoins", earnedCoins
        ));
    }
}