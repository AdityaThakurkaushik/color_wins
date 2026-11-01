package com.example.demo.controller;

import com.example.demo.JwtService;
import com.example.demo.entity.ReviewAgent;
import com.example.demo.service.ReviewAgentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/agent")
public class AgentAuthController {

    private final ReviewAgentService reviewAgentService;
    private final JwtService jwtService;

    public AgentAuthController(ReviewAgentService reviewAgentService, JwtService jwtService) {
        this.reviewAgentService = reviewAgentService;
        this.jwtService = jwtService;
    }

    public record LoginRequest(@NotBlank String agentId, @NotBlank String password, @NotBlank String panel) {}

    @PostMapping("/login")
    public Map<String, String> login(@Valid @RequestBody LoginRequest request) {
        String kind = "approval".equalsIgnoreCase(request.panel()) ? "APPROVAL"
                : "withdraw".equalsIgnoreCase(request.panel()) ? "WITHDRAW"
                : null;
        if (kind == null) {
            throw new IllegalArgumentException("Unknown panel");
        }
        ReviewAgent agent = reviewAgentService.login(request.agentId(), request.password(), kind);
        return Map.of(
                "token", jwtService.generateAgentToken(agent.getId(), agent.getKind()),
                "agentId", agent.getAgentCode(),
                "panel", kind);
    }
}
