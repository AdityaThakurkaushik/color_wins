package com.example.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "leaderboard_player")
public class LeaderboardPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slot_no", nullable = false, unique = true)
    private Integer slotNo;

    @Column(name = "display_name", nullable = false, length = 40)
    private String displayName;

    @Column(name = "profile_image", nullable = false, columnDefinition = "TEXT")
    private String profileImage;

    @Column(name = "total_bet", nullable = false)
    private Long totalBet = 0L;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public LeaderboardPlayer() {
    }

    public LeaderboardPlayer(Integer slotNo, String displayName, String profileImage) {
        this.slotNo = slotNo;
        this.displayName = displayName;
        this.profileImage = profileImage;
    }

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Integer getSlotNo() {
        return slotNo;
    }

    public void setSlotNo(Integer slotNo) {
        this.slotNo = slotNo;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getProfileImage() {
        return profileImage;
    }

    public void setProfileImage(String profileImage) {
        this.profileImage = profileImage;
    }

    public Long getTotalBet() {
        return totalBet == null ? 0L : totalBet;
    }

    public void setTotalBet(Long totalBet) {
        this.totalBet = totalBet == null || totalBet < 0 ? 0L : totalBet;
    }
}
