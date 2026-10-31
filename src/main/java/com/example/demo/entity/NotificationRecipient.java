
package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(
    name = "notification_recipients",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_notification_recipient",
            columnNames = {"notification_id", "user_id"}
        )
    },
    indexes = {
        @Index(
            name = "idx_notification_recipients_user",
            columnList = "user_id, created_at"
        ),
        @Index(
            name = "idx_notification_recipients_unread",
            columnList = "user_id, is_read"
        )
    }
)
public class NotificationRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "notification_id", nullable = false)
    private Notification notification;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "is_read", nullable = false)
    private Boolean read = false;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public Long getId() { return id; }

    public Notification getNotification() { return notification; }
    public void setNotification(Notification notification) {
        this.notification = notification;
    }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Boolean getRead() { return read; }
    public void setRead(Boolean read) { this.read = read; }

    public OffsetDateTime getReadAt() { return readAt; }
    public void setReadAt(OffsetDateTime readAt) {
        this.readAt = readAt;
    }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
