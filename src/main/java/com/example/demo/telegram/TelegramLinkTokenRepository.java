package com.example.demo.telegram;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TelegramLinkTokenRepository extends JpaRepository<TelegramLinkToken, String> {
}
