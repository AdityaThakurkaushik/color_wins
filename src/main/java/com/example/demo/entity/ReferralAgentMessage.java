package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "referral_agent_messages")
public class ReferralAgentMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_id", nullable = false)
    private Long agentId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 2000)
    private String body;

    @Column(nullable = false)
    private Boolean acknowledged = false;

    @Column(name = "acknowledged_at")
    private OffsetDateTime acknowledgedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected ReferralAgentMessage() {
    }

    public ReferralAgentMessage(Long agentId, String title, String body) {
        this.agentId = agentId;
        this.title = title;
        this.body = body;
        this.acknowledged = false;
    }

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public void acknowledge() {
        this.acknowledged = true;
        this.acknowledgedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getAgentId() {
        return agentId;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public boolean isAcknowledged() {
        return Boolean.TRUE.equals(acknowledged);
    }

    public OffsetDateTime getAcknowledgedAt() {
        return acknowledgedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
