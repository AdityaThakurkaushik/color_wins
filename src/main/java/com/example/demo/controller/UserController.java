package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.WalletHistoryService;
import com.example.demo.telegram.TelegramLinkService;
import com.example.demo.telegram.TelegramNotifier;
import com.example.demo.telegram.TelegramSettings;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserRepository userRepository;
    private final PointsTransactionRepository pointsTransactionRepository;
    private final WalletHistoryService walletHistoryService;
    private final TelegramSettings telegramSettings;
    private final TelegramLinkService telegramLinkService;
    private final TelegramNotifier telegramNotifier;

    public UserController(
            UserRepository userRepository,
            PointsTransactionRepository pointsTransactionRepository,
            WalletHistoryService walletHistoryService,
            TelegramSettings telegramSettings,
            TelegramLinkService telegramLinkService,
            TelegramNotifier telegramNotifier) {
        this.userRepository = userRepository;
        this.pointsTransactionRepository = pointsTransactionRepository;
        this.walletHistoryService = walletHistoryService;
        this.telegramSettings = telegramSettings;
        this.telegramLinkService = telegramLinkService;
        this.telegramNotifier = telegramNotifier;
    }

    public record WithdrawRequest(
            @NotNull Long amount,
            @NotBlank @Size(max = 100) String accountHolderName,
            @NotBlank String payoutMethod,
            String upiId,
            String bankName,
            String bankAccountNumber,
            String bankIfsc) {}

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "phoneNumber", user.getMobileNumber(),
                "virtualPoints", user.getVirtualPoints(),
                "role", user.getRole(),
                "referralCode", user.getReferralCode() == null ? "" : user.getReferralCode()
        ));
    }

    @GetMapping("/referral-stats")
    public ResponseEntity<?> getReferralStats(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String referralCode = user.getReferralCode();
        long totalReferrals = referralCode == null ? 0 : userRepository.countByReferredByCode(referralCode);
        Long earnedCoins = pointsTransactionRepository.sumReferralRewardsByUserId(user.getId());
        if (earnedCoins == null) earnedCoins = 0L;

        return ResponseEntity.ok(Map.of(
                "totalReferrals", totalReferrals,
                "successful", totalReferrals,
                "pending", 0L,
                "totalEarnedCoins", earnedCoins
        ));
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> transactions(Authentication authentication) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(walletHistoryService.history(user.getId()));
    }

    @PostMapping("/withdrawals")
    public ResponseEntity<?> withdraw(
            @Valid @RequestBody WithdrawRequest request,
            Authentication authentication) {
        User user = currentUser(authentication);
        var withdrawal = walletHistoryService.requestWithdrawal(
                user.getId(), request.amount(), request.payoutMethod(),
                request.accountHolderName(), request.upiId(), request.bankName(),
                request.bankAccountNumber(), request.bankIfsc());
        telegramNotifier.withdrawalRequested(withdrawal);
        return ResponseEntity.ok(Map.of(
                "publicId", withdrawal.getPublicId(),
                "amount", withdrawal.getAmount(),
                "status", withdrawal.getStatus()
        ));
    }

    @GetMapping("/telegram")
    public Map<String, Object> telegram(Authentication authentication) {
        User user = currentUser(authentication);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("enabled", telegramSettings.enabled());
        body.put("linked", user.getTelegramId() != null);
        body.put("botUsername", telegramSettings.username());
        return body;
    }

    @PostMapping("/telegram/link")
    public Map<String, String> telegramLink(Authentication authentication) {
        User user = currentUser(authentication);
        return Map.of("url", telegramLinkService.createLink(user));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}
