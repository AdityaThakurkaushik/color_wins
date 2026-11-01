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
    public List<Map<String, Object>> waiting() {
        return walletHistoryService.listPendingWithdrawals().stream().map(this::view).toList();
    }

    @PostMapping("/withdrawals/{publicId}/paid")
    public Map<String, Object> paid(@PathVariable String publicId, Authentication authentication) {
        Withdrawal withdrawal = walletHistoryService.markPaid(publicId);
        reviewAgentService.record(
                agent(authentication),
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
        Withdrawal withdrawal = walletHistoryService.reject(publicId, request.reason());
        reviewAgentService.record(
                agent(authentication),
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
        long id = Long.parseLong(authentication.getName().substring("agent:".length()));
        return reviewAgentService.require(id, "WITHDRAW");
    }

    private Map<String, Object> view(Withdrawal withdrawal) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("publicId", withdrawal.getPublicId());
        body.put("username", withdrawal.getUser().getUsername());
        body.put("amount", withdrawal.getAmount());
        body.put("status", withdrawal.getStatus());
        return body;
    }
}
