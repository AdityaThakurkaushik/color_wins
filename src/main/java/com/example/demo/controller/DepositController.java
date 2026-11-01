package com.example.demo.controller;

import com.example.demo.entity.Deposit;
import com.example.demo.entity.PaymentMethod;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.DepositService;
import com.example.demo.telegram.TelegramNotifier;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deposits")
public class DepositController {

    private final DepositService depositService;
    private final UserRepository userRepository;
    private final TelegramNotifier telegramNotifier;

    public DepositController(
            DepositService depositService,
            UserRepository userRepository,
            TelegramNotifier telegramNotifier) {
        this.depositService = depositService;
        this.userRepository = userRepository;
        this.telegramNotifier = telegramNotifier;
    }

    public record CreateDepositRequest(@NotNull Long amount) {}

    public record SubmitUtrRequest(@NotBlank String utr) {}

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateDepositRequest request, Authentication authentication) {
        User user = currentUser(authentication);
        Deposit deposit = depositService.create(user.getId(), request.amount());
        return ResponseEntity.ok(toView(deposit));
    }

    @GetMapping("/payment-method")
    public Map<String, Object> paymentMethod() {
        PaymentMethod method = depositService.activeMethod();
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("label", method.getLabel());
        view.put("upiId", method.getUpiId());
        return view;
    }

    @GetMapping
    public List<Map<String, Object>> list(Authentication authentication) {
        User user = currentUser(authentication);
        return depositService.listForUser(user.getId()).stream().map(this::toView).toList();
    }

    @GetMapping("/{publicId}")
    public Map<String, Object> get(@PathVariable String publicId, Authentication authentication) {
        User user = currentUser(authentication);
        return toView(depositService.getForUser(user.getId(), publicId));
    }

    @PostMapping("/{publicId}/utr")
    public Map<String, Object> submitUtr(
            @PathVariable String publicId,
            @Valid @RequestBody SubmitUtrRequest request,
            Authentication authentication) {
        User user = currentUser(authentication);
        Deposit deposit = depositService.submitUtr(user.getId(), publicId, request.utr());
        telegramNotifier.depositSubmitted(
                deposit.getPublicId(),
                user.getUsername(),
                deposit.getAmountRequested(),
                deposit.getUtr(),
                deposit.getPaymentMethod().getUpiId());
        return toView(deposit);
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalArgumentException("Authentication required");
        }
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private Map<String, Object> toView(Deposit deposit) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("publicId", deposit.getPublicId());
        view.put("amount", deposit.getAmountRequested());
        view.put("amountConfirmed", deposit.getAmountConfirmed());
        view.put("status", deposit.getStatus());
        view.put("utr", deposit.getUtr());
        view.put("rejectReason", deposit.getRejectReason());
        view.put("expiresAt", deposit.getExpiresAt().toString());
        view.put("upiId", deposit.getPaymentMethod().getUpiId());
        view.put("methodLabel", deposit.getPaymentMethod().getLabel());
        return view;
    }
}
