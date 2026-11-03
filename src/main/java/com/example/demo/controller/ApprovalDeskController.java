package com.example.demo.controller;

import com.example.demo.entity.Deposit;
import com.example.demo.entity.ReviewAgent;
import com.example.demo.service.DepositService;
import com.example.demo.service.ReviewAgentService;
import com.example.demo.telegram.TelegramNotifier;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approval")
public class ApprovalDeskController {

    private final DepositService depositService;
    private final ReviewAgentService reviewAgentService;
    private final TelegramNotifier telegramNotifier;

    public ApprovalDeskController(
            DepositService depositService,
            ReviewAgentService reviewAgentService,
            TelegramNotifier telegramNotifier) {
        this.depositService = depositService;
        this.reviewAgentService = reviewAgentService;
        this.telegramNotifier = telegramNotifier;
    }

    public record RejectRequest(@NotBlank String reason) {}

    @GetMapping("/deposits")
    public List<Map<String, Object>> waiting(Authentication authentication) {
        agent(authentication);
        return depositService.listSubmitted().stream().map(this::view).toList();
    }

    @PostMapping("/deposits/{publicId}/approve")
    public Map<String, Object> approve(@PathVariable String publicId, Authentication authentication) {
        ReviewAgent authorizedAgent = agent(authentication);
        Deposit deposit = depositService.approve(publicId);
        reviewAgentService.record(
                authorizedAgent,
                "DEPOSIT",
                "APPROVE",
                deposit.getPublicId(),
                deposit.getUser().getUsername(),
                deposit.getAmountConfirmed(),
                null);
        return view(deposit);
    }

    @PostMapping("/deposits/{publicId}/reject")
    public Map<String, Object> reject(
            @PathVariable String publicId,
            @Valid @RequestBody RejectRequest request,
            Authentication authentication) {
        ReviewAgent authorizedAgent = agent(authentication);
        Deposit deposit = depositService.reject(publicId, request.reason());
        reviewAgentService.record(
                authorizedAgent,
                "DEPOSIT",
                "REJECT",
                deposit.getPublicId(),
                deposit.getUser().getUsername(),
                deposit.getAmountRequested(),
                request.reason().trim());
        telegramNotifier.tellUser(
                deposit.getUser().getTelegramId(),
                deposit.getPublicId() + " was rejected.\nReason: " + request.reason().trim());
        return view(deposit);
    }

    private ReviewAgent agent(Authentication authentication) {
        if (authentication == null || authentication.getName() == null
                || !authentication.getName().startsWith("agent:")) {
            throw new org.springframework.security.access.AccessDeniedException("Approval agent access required");
        }
        long id = Long.parseLong(authentication.getName().substring("agent:".length()));
        return reviewAgentService.require(id, "APPROVAL");
    }

    private Map<String, Object> view(Deposit deposit) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("publicId", deposit.getPublicId());
        body.put("username", deposit.getUser().getUsername());
        body.put("amount", deposit.getAmountRequested());
        body.put("status", deposit.getStatus());
        body.put("utr", deposit.getUtr());
        body.put("upiId", deposit.getPaymentMethod().getUpiId());
        body.put("methodLabel", deposit.getPaymentMethod().getLabel());
        return body;
    }
}
