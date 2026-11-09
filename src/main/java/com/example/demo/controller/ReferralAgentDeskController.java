package com.example.demo.controller;

import com.example.demo.JwtService;
import com.example.demo.entity.ReferralAgent;
import com.example.demo.service.ReferralAgentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/referral-agent")
public class ReferralAgentDeskController {

    private final ReferralAgentService referralAgentService;
    private final JwtService jwtService;

    public ReferralAgentDeskController(ReferralAgentService referralAgentService, JwtService jwtService) {
        this.referralAgentService = referralAgentService;
        this.jwtService = jwtService;
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record ProfileRequest(
            @Size(max = 60) String displayName,
            @Size(max = 20) String phone,
            @Size(max = 200) String payoutNote
    ) {}

    public record WithdrawRequest(
            long amount,
            @NotBlank String payoutMethod,
            @NotBlank @Size(max = 100) String accountHolderName,
            String upiId,
            String bankName,
            String bankAccountNumber,
            String bankIfsc
    ) {}

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
        ReferralAgent agent = referralAgentService.login(request.username(), request.password());
        return Map.of(
                "token", jwtService.generateReferralAgentToken(agent.getId()),
                "username", agent.getUsername(),
                "displayName", agent.getDisplayName() == null ? agent.getUsername() : agent.getDisplayName(),
                "agentCode", agent.getAgentCode());
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        return referralAgentService.dashboard(agentId(authentication));
    }

    @PatchMapping("/profile")
    public Map<String, Object> profile(
            Authentication authentication,
            @Valid @RequestBody ProfileRequest request) {
        referralAgentService.updateProfile(
                agentId(authentication),
                request.displayName(),
                request.phone(),
                request.payoutNote());
        return referralAgentService.dashboard(agentId(authentication));
    }

    @GetMapping("/referrals")
    public List<Map<String, Object>> referrals(Authentication authentication) {
        return referralAgentService.referrals(agentId(authentication));
    }

    @GetMapping("/earnings")
    public List<Map<String, Object>> earnings(Authentication authentication) {
        return referralAgentService.earnings(agentId(authentication));
    }

    @GetMapping("/withdrawals")
    public List<Map<String, Object>> withdrawals(Authentication authentication) {
        return referralAgentService.withdrawals(agentId(authentication));
    }

    @GetMapping("/messages")
    public List<Map<String, Object>> messages(Authentication authentication) {
        return referralAgentService.messagesForAgent(agentId(authentication));
    }

    @PostMapping("/messages/{messageId}/ack")
    public Map<String, Object> acknowledgeMessage(
            Authentication authentication,
            @PathVariable Long messageId) {
        return referralAgentService.acknowledgeMessage(agentId(authentication), messageId);
    }

    @PostMapping("/withdrawals")
    public Map<String, Object> requestWithdraw(
            Authentication authentication,
            @Valid @RequestBody WithdrawRequest request) {
        long id = agentId(authentication);
        return Map.of(
                "withdrawal",
                referralAgentService.requestWithdrawalView(
                        id,
                        request.amount(),
                        request.payoutMethod(),
                        request.accountHolderName(),
                        request.upiId(),
                        request.bankName(),
                        request.bankAccountNumber(),
                        request.bankIfsc()),
                "me",
                referralAgentService.dashboard(id));
    }

    private long agentId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null
                || !authentication.getName().startsWith("refagent:")) {
            throw new IllegalArgumentException("Unauthorized");
        }
        return Long.parseLong(authentication.getName().substring("refagent:".length()));
    }
}
