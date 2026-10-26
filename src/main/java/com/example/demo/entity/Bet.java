
package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "bets", indexes = {
    @Index(name = "idx_bets_user_created", columnList = "user_id, created_at"),
    @Index(name = "idx_bets_round", columnList = "round_id")
})
public class Bet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private GameRound round;

    @Column(name = "selection_type", nullable = false, length = 10)
    private String selectionType;

    @Column(name = "selected_color", length = 10)
    private String selectedColor;

    @Column(name = "selected_number")
    private Short selectedNumber;

    @Column(nullable = false)
    private Long amount;

    @Column(nullable = false, length = 10)
    private String status = "PENDING";

    @Column(name = "points_payout", nullable = false)
    private Long pointsPayout = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Bet() {
    }

    public Bet(User user, GameRound round, String selectionType,
               String selectedColor, Short selectedNumber, Long amount) {
        this.user = user;
        this.round = round;
        this.selectionType = selectionType;
        this.selectedColor = selectedColor;
        this.selectedNumber = selectedNumber;
        this.amount = amount;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public GameRound getRound() { return round; }
    public String getSelectionType() { return selectionType; }
    public String getSelectedColor() { return selectedColor; }
    public Short getSelectedNumber() { return selectedNumber; }
    public Long getAmount() { return amount; }
    public String getStatus() { return status; }
    public Long getPointsPayout() { return pointsPayout; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public void markWon(Long payout) {
        this.status = "WON";
        this.pointsPayout = payout;
    }

    public void markLost() {
        this.status = "LOST";
        this.pointsPayout = 0L;
    }
}
