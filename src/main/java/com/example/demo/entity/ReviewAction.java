package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "review_actions")
public class ReviewAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agent_id", nullable = false)
    private ReviewAgent agent;

    @Column(nullable = false, length = 20)
    private String kind;

    @Column(nullable = false, length = 20)
    private String action;

    @Column(name = "public_id", nullable = false, length = 20)
    private String publicId;

    @Column(name = "player_name", nullable = false, length = 40)
    private String playerName;

    @Column(nullable = false)
    private Long amount;

    @Column(length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected ReviewAction() {
    }

    public ReviewAction(
            ReviewAgent agent,
            String kind,
            String action,
            String publicId,
            String playerName,
            long amount,
            String reason) {
        this.agent = agent;
        this.kind = kind;
        this.action = action;
        this.publicId = publicId;
        this.playerName = playerName;
        this.amount = amount;
        this.reason = reason;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public ReviewAgent getAgent() { return agent; }
    public String getKind() { return kind; }
    public String getAction() { return action; }
    public String getPublicId() { return publicId; }
    public String getPlayerName() { return playerName; }
    public Long getAmount() { return amount; }
    public String getReason() { return reason; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
