package com.example.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "leaderboard_settings")
public class LeaderboardSettings {

    @Id
    private Short id = 1;

    @Column(name = "rotation_hours", nullable = false)
    private Integer rotationHours = 24;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public LeaderboardSettings() {
    }

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public Short getId() {
        return id;
    }

    public Integer getRotationHours() {
        return rotationHours;
    }

    public void setRotationHours(Integer rotationHours) {
        this.rotationHours = rotationHours;
    }
}
