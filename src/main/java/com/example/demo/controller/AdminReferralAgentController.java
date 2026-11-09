package com.example.demo.controller;

import com.example.demo.entity.ReferralAgent;
import com.example.demo.service.ReferralAgentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/referral-agents")
public class AdminReferralAgentController {

    private final ReferralAgentService referralAgentService;

    public AdminReferralAgentController(ReferralAgentService referralAgentService) {
        this.referralAgentService = referralAgentService;
    }

    public record CreateRequest(
            @NotBlank @Size(min = 3, max = 40) String username,
            @NotBlank @Size(min = 8, max = 72) String password,
            String displayName,
            String agentCode
    ) {}

    public record StatusRequest(boolean active) {}

    public record PasswordRequest(@NotBlank @Size(min = 8, max = 72) String password) {}

    public record UpdateRequest(
            String displayName,
            String agentCode,
            BigDecimal firstDepositPercent,
            BigDecimal nextDepositPercent,
            Boolean clearFirstDepositPercent,
            Boolean clearNextDepositPercent,
            Long minBalance,
            Boolean clearMinBalance
    ) {}

    public record BalanceRequest(long delta, String note) {}

    public record RejectRequest(@NotBlank @Size(max = 255) String reason) {}

    public record MessageRequest(
            Long agentId,
            @NotBlank @Size(max = 120) String title,
            @NotBlank @Size(max = 2000) String body
    ) {}

    @GetMapping
    public List<Map<String, Object>> list() {
        return referralAgentService.list().stream()
                .map(referralAgentService::adminView)
                .toList();
    }

    @PostMapping
    public Map<String, Object> create(@Valid @RequestBody CreateRequest request) {
        ReferralAgent agent = referralAgentService.create(
                request.username(),
                request.password(),
                request.displayName(),
                request.agentCode());
        return referralAgentService.adminView(agent);
    }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable Long id, @RequestBody UpdateRequest request) {
        return referralAgentService.adminView(referralAgentService.updateAdmin(
                id,
                request.displayName(),
                request.agentCode(),
                request.firstDepositPercent(),
                request.nextDepositPercent(),
                Boolean.TRUE.equals(request.clearFirstDepositPercent()),
                Boolean.TRUE.equals(request.clearNextDepositPercent()),
                request.minBalance(),
                Boolean.TRUE.equals(request.clearMinBalance())));
    }

    @PostMapping("/messages")
    public Map<String, Object> sendMessage(@Valid @RequestBody MessageRequest request) {
        int sent = referralAgentService.sendMessage(request.agentId(), request.title(), request.body());
        return Map.of(
                "status", "OK",
                "sent", sent,
                "message", request.agentId() == null
                        ? "Message sent to all active agents."
                        : "Message sent to the selected agent.");
    }

    @PatchMapping("/{id}/status")
    public Map<String, Object> status(@PathVariable Long id, @RequestBody StatusRequest request) {
        return referralAgentService.adminView(referralAgentService.setActive(id, request.active()));
    }

    @PostMapping("/{id}/password")
    public Map<String, Object> password(@PathVariable Long id, @Valid @RequestBody PasswordRequest request) {
        return referralAgentService.adminView(referralAgentService.resetPassword(id, request.password()));
    }

    @PostMapping("/{id}/balance")
    public Map<String, Object> balance(@PathVariable Long id, @RequestBody BalanceRequest request) {
        return referralAgentService.adminView(
                referralAgentService.adjustBalance(id, request.delta(), request.note()));
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable Long id) {
        referralAgentService.delete(id);
        return Map.of("status", "OK", "message", "Agent deleted");
    }

    @GetMapping("/{id}/referrals")
    public List<Map<String, Object>> referrals(@PathVariable Long id) {
        return referralAgentService.referrals(id);
    }

    @GetMapping("/{id}/earnings")
    public List<Map<String, Object>> earnings(@PathVariable Long id) {
        return referralAgentService.earnings(id);
    }

    @GetMapping("/{id}/withdrawals")
    public List<Map<String, Object>> withdrawals(@PathVariable Long id) {
        return referralAgentService.withdrawals(id);
    }

    @GetMapping("/pending-withdrawals")
    public List<Map<String, Object>> pendingWithdrawals() {
        return referralAgentService.pendingWithdrawals();
    }

    @PostMapping("/withdrawals/{withdrawalId}/paid")
    public Map<String, Object> markPaid(@PathVariable Long withdrawalId) {
        return referralAgentService.markWithdrawalPaid(withdrawalId);
    }

    @PostMapping("/withdrawals/{withdrawalId}/reject")
    public Map<String, Object> reject(
            @PathVariable Long withdrawalId,
            @Valid @RequestBody RejectRequest request) {
        return referralAgentService.rejectWithdrawal(withdrawalId, request.reason());
    }
}
