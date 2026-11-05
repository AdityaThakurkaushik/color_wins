package com.example.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "anger_button_user")
public class AngerButtonUser {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 32)
    private String label;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public AngerButtonUser() {
    }

    public AngerButtonUser(Long userId, String label) {
        this.userId = userId;
        this.label = label;
    }

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getUserId() {
        return userId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }
}
