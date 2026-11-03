package com.example.demo.controller;

import com.example.demo.entity.ReviewAgent;
import com.example.demo.entity.Withdrawal;
import com.example.demo.service.ReviewAgentService;
import com.example.demo.service.WalletHistoryService;
import com.example.demo.telegram.TelegramNotifier;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/withdraw-agent")
public class WithdrawDeskController {

    private final WalletHistoryService walletHistoryService;
    private final ReviewAgentService reviewAgentService;
    private final TelegramNotifier telegramNotifier;

    public WithdrawDeskController(
            WalletHistoryService walletHistoryService,
            ReviewAgentService reviewAgentService,
            TelegramNotifier telegramNotifier) {
        this.walletHistoryService = walletHistoryService;
        this.reviewAgentService = reviewAgentService;
        this.telegramNotifier = telegramNotifier;
    }

    public record RejectRequest(@NotBlank String reason) {}

    @GetMapping("/withdrawals")
    public List<Map<String, Object>> waiting(Authentication authentication) {
        agent(authentication);
        return walletHistoryService.listPendingWithdrawals().stream().map(this::view).toList();
    }

    @PostMapping("/withdrawals/{publicId}/paid")
    public Map<String, Object> paid(@PathVariable String publicId, Authentication authentication) {
        ReviewAgent authorizedAgent = agent(authentication);
        Withdrawal withdrawal = walletHistoryService.markPaid(publicId);
        reviewAgentService.record(
                authorizedAgent,
                "WITHDRAWAL",
                "APPROVE",
                withdrawal.getPublicId(),
                withdrawal.getUser().getUsername(),
                withdrawal.getAmount(),
                null);
        return view(withdrawal);
    }

    @PostMapping("/withdrawals/{publicId}/reject")
    public Map<String, Object> reject(
            @PathVariable String publicId,
            @Valid @RequestBody RejectRequest request,
            Authentication authentication) {
        ReviewAgent authorizedAgent = agent(authentication);
        Withdrawal withdrawal = walletHistoryService.reject(publicId, request.reason());
        reviewAgentService.record(
                authorizedAgent,
                "WITHDRAWAL",
                "REJECT",
                withdrawal.getPublicId(),
                withdrawal.getUser().getUsername(),
                withdrawal.getAmount(),
                request.reason().trim());
        telegramNotifier.tellUser(
                withdrawal.getUser().getTelegramId(),
                withdrawal.getPublicId() + " was rejected. Your coins were returned.\nReason: " + request.reason().trim());
        return view(withdrawal);
    }

    private ReviewAgent agent(Authentication authentication) {
        if (authentication == null || authentication.getName() == null
                || !authentication.getName().startsWith("agent:")) {
            throw new org.springframework.security.access.AccessDeniedException("Withdrawal agent access required");
        }
        long id = Long.parseLong(authentication.getName().substring("agent:".length()));
        return reviewAgentService.require(id, "WITHDRAW");
    }

    private Map<String, Object> view(Withdrawal withdrawal) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("publicId", withdrawal.getPublicId());
        body.put("username", withdrawal.getUser().getUsername());
        body.put("amount", withdrawal.getAmount());
        body.put("status", withdrawal.getStatus());
        body.put("payoutMethod", withdrawal.getPayoutMethod());
        body.put("accountHolderName", withdrawal.getAccountHolderName());
        body.put("upiId", withdrawal.getUpiId());
        body.put("bankName", withdrawal.getBankName());
        body.put("bankAccountNumber", withdrawal.getBankAccountNumber());
        body.put("bankIfsc", withdrawal.getBankIfsc());
        return body;
    }
}
