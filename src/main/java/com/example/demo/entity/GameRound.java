
package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "game_rounds")
public class GameRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "period_number", nullable = false, unique = true, length = 40)
    private String periodNumber;

    @Column(nullable = false, length = 20)
    private String status = "OPEN";

    @Column(name = "starts_at", nullable = false)
    private OffsetDateTime startsAt;

    @Column(name = "ends_at", nullable = false)
    private OffsetDateTime endsAt;

    @Column(name = "result_number")
    private Short resultNumber;

    @Column(name = "result_color", length = 10)
    private String resultColor;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected GameRound() {
    }

    public GameRound(String periodNumber, OffsetDateTime startsAt,
                     OffsetDateTime endsAt) {
        this.periodNumber = periodNumber;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getPeriodNumber() { return periodNumber; }
    public String getStatus() { return status; }
    public OffsetDateTime getStartsAt() { return startsAt; }
    public OffsetDateTime getEndsAt() { return endsAt; }
    public Short getResultNumber() { return resultNumber; }
    public String getResultColor() { return resultColor; }

    public void close() {
        this.status = "CLOSED";
    }

    public void declareResult(Short number, String color) {
        this.resultNumber = number;
        this.resultColor = color;
        this.status = "RESULT_DECLARED";
    }
}
