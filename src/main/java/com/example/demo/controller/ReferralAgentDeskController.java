package com.example.demo.controller;

import com.example.demo.JwtService;
import com.example.demo.entity.ReferralAgent;
import com.example.demo.service.ReferralAgentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
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

    @GetMapping("/referrals")
    public List<Map<String, Object>> referrals(Authentication authentication) {
        return referralAgentService.referrals(agentId(authentication));
    }

    @GetMapping("/earnings")
    public List<Map<String, Object>> earnings(Authentication authentication) {
        return referralAgentService.earnings(agentId(authentication));
    }

    private long agentId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null
                || !authentication.getName().startsWith("refagent:")) {
            throw new IllegalArgumentException("Unauthorized");
        }
        return Long.parseLong(authentication.getName().substring("refagent:".length()));
    }
}
