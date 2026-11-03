package com.example.demo.controller;

import com.example.demo.entity.Withdrawal;
import com.example.demo.service.WalletHistoryService;
import com.example.demo.telegram.TelegramNotifier;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin-only withdrawal management. Payout data is decrypted by the JPA
 * converter and returned only from this role-protected endpoint.
 */
@RestController
@RequestMapping("/api/admin/withdrawals")
public class AdminWithdrawalController {

    private final com.example.demo.repository.WithdrawalRepository withdrawalRepository;
    private final WalletHistoryService walletHistoryService;
    private final TelegramNotifier telegramNotifier;

    public AdminWithdrawalController(
            com.example.demo.repository.WithdrawalRepository withdrawalRepository,
            WalletHistoryService walletHistoryService,
            TelegramNotifier telegramNotifier) {
        this.withdrawalRepository = withdrawalRepository;
        this.walletHistoryService = walletHistoryService;
        this.telegramNotifier = telegramNotifier;
    }

    public record RejectRequest(@NotBlank String reason) {}

    @GetMapping
    public List<Map<String, Object>> list() {
        return withdrawalRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::view).toList();
    }

    @PostMapping("/{publicId}/paid")
    public Map<String, Object> paid(@PathVariable String publicId) {
        return view(walletHistoryService.markPaid(publicId));
    }

    @PostMapping("/{publicId}/reject")
    public Map<String, Object> reject(
            @PathVariable String publicId,
            @Valid @RequestBody RejectRequest request) {
        Withdrawal withdrawal = walletHistoryService.reject(publicId, request.reason());
        telegramNotifier.tellUser(
                withdrawal.getUser().getTelegramId(),
                withdrawal.getPublicId() + " was rejected. Your coins were returned.\\nReason: "
                        + request.reason().trim());
        return view(withdrawal);
    }

    private Map<String, Object> view(Withdrawal withdrawal) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("publicId", withdrawal.getPublicId());
        body.put("userId", withdrawal.getUser().getId());
        body.put("username", withdrawal.getUser().getUsername());
        body.put("amount", withdrawal.getAmount());
        body.put("status", withdrawal.getStatus());
        body.put("payoutMethod", withdrawal.getPayoutMethod());
        body.put("accountHolderName", withdrawal.getAccountHolderName());
        body.put("upiId", withdrawal.getUpiId());
        body.put("bankName", withdrawal.getBankName());
        body.put("bankAccountNumber", withdrawal.getBankAccountNumber());
        body.put("bankIfsc", withdrawal.getBankIfsc());
        body.put("rejectReason", withdrawal.getRejectReason());
        body.put("createdAt", withdrawal.getCreatedAt());
        return body;
    }
}
