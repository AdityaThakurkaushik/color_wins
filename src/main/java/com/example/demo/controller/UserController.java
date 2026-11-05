package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.repository.BetRepository;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.WalletHistoryService;
import com.example.demo.service.WalletPolicyService;
import com.example.demo.telegram.TelegramLinkService;
import com.example.demo.util.DisplayNames;
import com.example.demo.util.ImageDataUrls;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserRepository userRepository;
    private final PointsTransactionRepository pointsTransactionRepository;
    private final BetRepository betRepository;
    private final WalletHistoryService walletHistoryService;
    private final TelegramSettings telegramSettings;
    private final TelegramLinkService telegramLinkService;
    private final TelegramNotifier telegramNotifier;
    private final WalletPolicyService walletPolicyService;

    public UserController(
            UserRepository userRepository,
            PointsTransactionRepository pointsTransactionRepository,
            BetRepository betRepository,
            WalletHistoryService walletHistoryService,
            TelegramSettings telegramSettings,
            TelegramLinkService telegramLinkService,
            TelegramNotifier telegramNotifier,
            WalletPolicyService walletPolicyService) {
        this.userRepository = userRepository;
        this.pointsTransactionRepository = pointsTransactionRepository;
        this.betRepository = betRepository;
        this.walletHistoryService = walletHistoryService;
        this.telegramSettings = telegramSettings;
        this.telegramLinkService = telegramLinkService;
        this.telegramNotifier = telegramNotifier;
        this.walletPolicyService = walletPolicyService;
    }

    public record WithdrawRequest(
            @NotNull Long amount,
            @NotBlank @Size(max = 100) String accountHolderName,
            @NotBlank String payoutMethod,
            String upiId,
            String bankName,
            String bankAccountNumber,
            String bankIfsc) {}

    public record ProfileUpdateRequest(String displayName, String profileImage) {}

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        return ResponseEntity.ok(profileView(currentUser(authentication)));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody ProfileUpdateRequest request,
            Authentication authentication) {
        User user = currentUser(authentication);
        if (request.displayName() != null) {
            String name = request.displayName().trim();
            user.setDisplayName(name.isEmpty() ? null : DisplayNames.normalize(request.displayName()));
        }
        if (request.profileImage() != null) {
            user.setProfileImage(ImageDataUrls.normalize(request.profileImage()));
        }
        userRepository.save(user);
        return ResponseEntity.ok(profileView(user));
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

    @GetMapping("/referral-network")
    public ResponseEntity<?> getReferralNetwork(Authentication authentication) {
        User user = currentUser(authentication);
        String referralCode = user.getReferralCode();
        List<Map<String, Object>> referrals = new ArrayList<>();
        if (referralCode != null && !referralCode.isBlank()) {
            for (User referred : userRepository.findByReferredByCodeOrderByCreatedAtDesc(referralCode)) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("username", referred.getUsername());
                row.put("displayName",
                        referred.getDisplayName() == null ? referred.getUsername() : referred.getDisplayName());
                row.put("joinedAt", referred.getCreatedAt());
                row.put("betsCount", betRepository.countByUserId(referred.getId()));
                row.put("verified", referred.isEmailVerified());
                referrals.add(row);
            }
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("totalReferrals", referrals.size());
        body.put("referrals", referrals);
        return ResponseEntity.ok(body);
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

    private Map<String, Object> profileView(User user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("username", user.getUsername());
        body.put("displayName", user.getDisplayName() == null ? "" : user.getDisplayName());
        body.put("profileImage", user.getProfileImage() == null ? "" : user.getProfileImage());
        body.put("email", user.getEmail());
        body.put("phoneNumber", user.getMobileNumber());
        body.put("virtualPoints", user.getVirtualPoints());
        WalletPolicyService.ResolvedPolicy policy = walletPolicyService.resolve(user.getId());
        body.put("minWithdrawalEnabled", policy.minWithdrawalEnabled());
        body.put("minWithdrawalAmount", policy.minWithdrawalAmount());
        body.put("role", user.getRole());
        body.put("referralCode", user.getReferralCode() == null ? "" : user.getReferralCode());
        return body;
    }

}
