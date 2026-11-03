package com.example.demo.controller;

import com.example.demo.entity.ReviewAction;
import com.example.demo.entity.ReviewAgent;
import com.example.demo.service.ReviewAgentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/review")
public class AdminReviewController {

    private final ReviewAgentService reviewAgentService;

    public AdminReviewController(ReviewAgentService reviewAgentService) {
        this.reviewAgentService = reviewAgentService;
    }

    public record CreateAgentRequest(@NotBlank String agentId, @NotBlank String password, @NotBlank String kind) {}
    public record AgentStatusRequest(boolean active) {}

    @PostMapping("/agents")
    public Map<String, Object> create(@Valid @RequestBody CreateAgentRequest request) {
        return agentView(reviewAgentService.create(request.agentId(), request.password(), request.kind()));
    }

    @GetMapping("/agents")
    public List<Map<String, Object>> agents(@RequestParam String kind) {
        return reviewAgentService.list(normalizeKind(kind)).stream().map(this::agentView).toList();
    }

    @PatchMapping("/agents/{id}/status")
    public Map<String, Object> updateAgentStatus(
            @PathVariable Long id,
            @RequestParam String kind,
            @Valid @RequestBody AgentStatusRequest request) {
        return agentView(reviewAgentService.setActive(id, normalizeKind(kind), request.active()));
    }

    @GetMapping("/activity")
    public Map<String, Object> activity(@RequestParam String kind, @RequestParam(defaultValue = "0") int page) {
        Page<ReviewAction> result = reviewAgentService.activity(activityKind(kind), page);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("page", result.getNumber());
        body.put("totalPages", result.getTotalPages());
        body.put("total", result.getTotalElements());
        body.put("items", result.getContent().stream().map(this::actionView).toList());
        return body;
    }

    private Map<String, Object> agentView(ReviewAgent agent) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", agent.getId());
        body.put("agentId", agent.getAgentCode());
        body.put("kind", agent.getKind());
        body.put("active", agent.isActive());
        body.put("createdAt", agent.getCreatedAt().toString());
        return body;
    }

    private Map<String, Object> actionView(ReviewAction action) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", action.getId());
        body.put("agentId", action.getAgent().getAgentCode());
        body.put("action", action.getAction());
        body.put("publicId", action.getPublicId());
        body.put("player", action.getPlayerName());
        body.put("amount", action.getAmount());
        body.put("reason", action.getReason());
        body.put("createdAt", action.getCreatedAt().toString());
        return body;
    }

    private String normalizeKind(String kind) {
        if ("APPROVAL".equals(kind) || "WITHDRAW".equals(kind)) {
            return kind;
        }
        throw new IllegalArgumentException("Unknown agent type");
    }

    private String activityKind(String kind) {
        if ("DEPOSIT".equals(kind) || "WITHDRAWAL".equals(kind)) {
            return kind;
        }
        throw new IllegalArgumentException("Unknown activity type");
    }
}
