package com.example.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "anger_button_setting")
public class AngerButtonSetting {

    @Id
    private Short id = 1;

    @Column(nullable = false, length = 32)
    private String label = "LET IT OUT";

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public AngerButtonSetting() {
    }

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }
}
