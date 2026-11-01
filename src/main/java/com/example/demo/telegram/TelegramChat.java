package com.example.demo.telegram;

import com.example.demo.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "telegram_chats")
public class TelegramChat {

    @Id
    @Column(name = "chat_id")
    private Long chatId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "pending_public_id", length = 20)
    private String pendingPublicId;

    protected TelegramChat() {
    }

    public TelegramChat(Long chatId) {
        this.chatId = chatId;
    }

    public Long getChatId() {
        return chatId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getPendingPublicId() {
        return pendingPublicId;
    }

    public void setPendingPublicId(String pendingPublicId) {
        this.pendingPublicId = pendingPublicId;
    }
}
