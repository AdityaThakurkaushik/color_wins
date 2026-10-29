package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "game_control")
public class GameControl {

    @Id
    @Column(name = "id")
    private Short id = 1;

    @Column(name = "state", nullable = false, length = 20)
    private String state;

    @Column(name = "paused_remaining_seconds")
    private Long pausedRemainingSeconds;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected GameControl() {
    }

    public Short getId() {
        return id;
    }

    public String getState() {
        return state;
    }

    public Long getPausedRemainingSeconds() {
        return pausedRemainingSeconds;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void start() {
        this.state = "RUNNING";
        this.pausedRemainingSeconds = null;
        this.updatedAt = OffsetDateTime.now();
    }

    public void pause(long remainingSeconds) {
        this.state = "PAUSED";
        this.pausedRemainingSeconds = Math.max(0, remainingSeconds);
        this.updatedAt = OffsetDateTime.now();
    }

    public void resume() {
        this.state = "RUNNING";
        this.pausedRemainingSeconds = null;
        this.updatedAt = OffsetDateTime.now();
    }

    public void stop() {
        this.state = "STOPPED";
        this.pausedRemainingSeconds = null;
        this.updatedAt = OffsetDateTime.now();
    }

    public void beginStopping() {
        this.state = "STOPPING";
        this.pausedRemainingSeconds = null;
        this.updatedAt = OffsetDateTime.now();
    }
}