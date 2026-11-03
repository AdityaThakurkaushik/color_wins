package com.example.demo.service;

import com.example.demo.entity.ReviewAction;
import com.example.demo.entity.ReviewAgent;
import com.example.demo.repository.ReviewActionRepository;
import com.example.demo.repository.ReviewAgentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReviewAgentService {

    public static final int PAGE_SIZE = 10;

    private final ReviewAgentRepository agentRepository;
    private final ReviewActionRepository actionRepository;
    private final PasswordEncoder passwordEncoder;

    public ReviewAgentService(
            ReviewAgentRepository agentRepository,
            ReviewActionRepository actionRepository,
            PasswordEncoder passwordEncoder) {
        this.agentRepository = agentRepository;
        this.actionRepository = actionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public ReviewAgent create(String rawCode, String rawPassword, String kind) {
        String code = normalizeCode(rawCode);
        if (rawPassword == null || rawPassword.length() < 6 || rawPassword.length() > 72) {
            throw new IllegalArgumentException("Password must be 6 to 72 characters");
        }
        if (!"APPROVAL".equals(kind) && !"WITHDRAW".equals(kind)) {
            throw new IllegalArgumentException("Unknown agent type");
        }
        if (agentRepository.findByAgentCodeIgnoreCase(code).isPresent()) {
            throw new IllegalArgumentException("This agent ID already exists");
        }
        return agentRepository.save(new ReviewAgent(code, passwordEncoder.encode(rawPassword), kind));
    }

    @Transactional(readOnly = true)
    public ReviewAgent login(String rawCode, String rawPassword, String kind) {
        ReviewAgent agent = agentRepository.findByAgentCodeIgnoreCase(normalizeCode(rawCode))
                .orElseThrow(() -> new IllegalArgumentException("Agent ID or password is wrong"));
        if (!agent.isActive() || !agent.getKind().equals(kind) || !passwordEncoder.matches(rawPassword, agent.getPasswordHash())) {
            throw new IllegalArgumentException("Agent ID or password is wrong");
        }
        return agent;
    }

    @Transactional(readOnly = true)
    public List<ReviewAgent> list(String kind) {
        return agentRepository.findByKindOrderByCreatedAtDesc(kind);
    }

    @Transactional
    public ReviewAgent setActive(Long id, String kind, boolean active) {
        ReviewAgent agent = agentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Agent not found"));
        if (!agent.getKind().equals(kind)) {
            throw new IllegalArgumentException("Agent not found");
        }
        agent.setActive(active);
        return agentRepository.save(agent);
    }

    @Transactional(readOnly = true)
    public ReviewAgent require(Long id, String kind) {
        ReviewAgent agent = agentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Agent not found"));
        if (!agent.isActive() || !agent.getKind().equals(kind)) {
            throw new IllegalArgumentException("Agent not found");
        }
        return agent;
    }

    @Transactional
    public void record(
            ReviewAgent agent,
            String kind,
            String action,
            String publicId,
            String playerName,
            long amount,
            String reason) {
        actionRepository.save(new ReviewAction(agent, kind, action, publicId, playerName, amount, reason));
    }

    @Transactional(readOnly = true)
    public Page<ReviewAction> activity(String kind, int page) {
        int safePage = Math.max(page, 0);
        return actionRepository.findByKindOrderByCreatedAtDesc(kind, PageRequest.of(safePage, PAGE_SIZE));
    }

    private String normalizeCode(String rawCode) {
        String code = rawCode == null ? "" : rawCode.trim();
        if (!code.matches("^[A-Za-z0-9_-]{3,30}$")) {
            throw new IllegalArgumentException("Agent ID must be 3 to 30 letters, numbers, _ or -");
        }
        return code;
    }
}
