package com.example.demo.controller;

import com.example.demo.entity.Deposit;
import com.example.demo.entity.PaymentMethod;
import com.example.demo.entity.Withdrawal;
import com.example.demo.service.DepositService;
import com.example.demo.service.WalletHistoryService;
import com.example.demo.telegram.TelegramNotifier;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminDepositController {

    private final DepositService depositService;
    private final WalletHistoryService walletHistoryService;
    private final TelegramNotifier telegramNotifier;

    public AdminDepositController(
            DepositService depositService,
            WalletHistoryService walletHistoryService,
            TelegramNotifier telegramNotifier) {
        this.depositService = depositService;
        this.walletHistoryService = walletHistoryService;
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
    public List<Map<String, Object>> submitted() {
        return depositService.listSubmitted().stream().map(this::toAdminView).toList();
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
                deposit.getPublicId() + " was rejected.\nReason: " + request.reason().trim());
        return toAdminView(deposit);
    }

    @GetMapping("/withdrawals")
    public List<Map<String, Object>> withdrawals() {
        return walletHistoryService.listPendingWithdrawals().stream().map(this::toWithdrawalView).toList();
    }

    @PostMapping("/withdrawals/{publicId}/paid")
    public Map<String, Object> markPaid(@PathVariable String publicId) {
        return toWithdrawalView(walletHistoryService.markPaid(publicId));
    }

    @PostMapping("/withdrawals/{publicId}/reject")
    public Map<String, Object> rejectWithdrawal(
            @PathVariable String publicId,
            @Valid @RequestBody RejectRequest request) {
        Withdrawal withdrawal = walletHistoryService.reject(publicId, request.reason());
        telegramNotifier.tellUser(
                withdrawal.getUser().getTelegramId(),
                withdrawal.getPublicId() + " was rejected. Your coins were returned.\nReason: " + request.reason().trim());
        return toWithdrawalView(withdrawal);
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
        view.put("username", deposit.getUser().getUsername());
        view.put("amount", deposit.getAmountRequested());
        view.put("status", deposit.getStatus());
        view.put("utr", deposit.getUtr());
        view.put("upiId", deposit.getPaymentMethod().getUpiId());
        view.put("methodLabel", deposit.getPaymentMethod().getLabel());
        view.put("rejectReason", deposit.getRejectReason());
        return view;
    }

    private Map<String, Object> toWithdrawalView(Withdrawal withdrawal) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("publicId", withdrawal.getPublicId());
        view.put("username", withdrawal.getUser().getUsername());
        view.put("amount", withdrawal.getAmount());
        view.put("status", withdrawal.getStatus());
        view.put("rejectReason", withdrawal.getRejectReason());
        return view;
    }
}
