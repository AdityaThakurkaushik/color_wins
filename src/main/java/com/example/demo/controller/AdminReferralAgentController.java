package com.example.demo.controller;

import com.example.demo.entity.ReferralAgent;
import com.example.demo.service.ReferralAgentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

    @PatchMapping("/{id}/status")
    public Map<String, Object> status(@PathVariable Long id, @RequestBody StatusRequest request) {
        return referralAgentService.adminView(referralAgentService.setActive(id, request.active()));
    }

    @PostMapping("/{id}/password")
    public Map<String, Object> password(@PathVariable Long id, @Valid @RequestBody PasswordRequest request) {
        return referralAgentService.adminView(referralAgentService.resetPassword(id, request.password()));
    }
}
