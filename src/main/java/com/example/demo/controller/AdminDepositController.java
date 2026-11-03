package com.example.demo.controller;

import com.example.demo.entity.Deposit;
import com.example.demo.entity.PaymentMethod;
import com.example.demo.service.DepositService;
import com.example.demo.repository.DepositRepository;
import com.example.demo.telegram.TelegramNotifier;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminDepositController {

    private final DepositService depositService;
    private final DepositRepository depositRepository;
    private final TelegramNotifier telegramNotifier;

    public AdminDepositController(DepositService depositService, DepositRepository depositRepository, TelegramNotifier telegramNotifier) {
        this.depositService = depositService;
        this.depositRepository = depositRepository;
        this.telegramNotifier = telegramNotifier;
    }

    public record PaymentMethodRequest(
            Long id,
            @NotBlank String label,
            @NotBlank String upiId,
            boolean active,
            int priority) {}

    public record RejectRequest(@NotBlank String reason) {}

    @GetMapping("/deposits")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> submitted() {
        return depositRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toAdminView).toList();
    }

    @PostMapping("/deposits/{publicId}/approve")
    public Map<String, Object> approve(@PathVariable String publicId) {
        return toAdminView(depositService.approve(publicId));
    }

    @PostMapping("/deposits/{publicId}/reject")
    public Map<String, Object> reject(@PathVariable String publicId, @Valid @RequestBody RejectRequest request) {
        Deposit deposit = depositService.reject(publicId, request.reason());
        telegramNotifier.tellUser(
                deposit.getUser().getTelegramId(),
                deposit.getPublicId() + " was rejected.\\nReason: " + request.reason().trim());
        return toAdminView(deposit);
    }

    @GetMapping("/payment-methods")
    public List<PaymentMethod> methods() {
        return depositService.listMethods();
    }

    @PostMapping("/payment-methods")
    public PaymentMethod saveMethod(@Valid @RequestBody PaymentMethodRequest request) {
        return depositService.saveMethod(
                request.id(), request.label(), request.upiId(), request.active(), request.priority());
    }

    private Map<String, Object> toAdminView(Deposit deposit) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("publicId", deposit.getPublicId());
        view.put("userId", deposit.getUser().getId());
        view.put("username", deposit.getUser().getUsername());
        view.put("amount", deposit.getAmountRequested());
        view.put("amountConfirmed", deposit.getAmountConfirmed());
        view.put("status", deposit.getStatus());
        view.put("utr", deposit.getUtr());
        view.put("upiId", deposit.getPaymentMethod().getUpiId());
        view.put("methodLabel", deposit.getPaymentMethod().getLabel());
        view.put("rejectReason", deposit.getRejectReason());
        view.put("submittedAt", deposit.getSubmittedAt());
        view.put("createdAt", deposit.getCreatedAt());
        view.put("expiresAt", deposit.getExpiresAt());
        return view;
    }
}
