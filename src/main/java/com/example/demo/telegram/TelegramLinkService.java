package com.example.demo.telegram;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;

@Service
public class TelegramLinkService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final TelegramSettings settings;
    private final TelegramLinkTokenRepository tokenRepository;
    private final UserRepository userRepository;

    public TelegramLinkService(
            TelegramSettings settings,
            TelegramLinkTokenRepository tokenRepository,
            UserRepository userRepository) {
        this.settings = settings;
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public String createLink(User user) {
        if (!settings.enabled() || settings.username().isBlank()) {
            throw new IllegalArgumentException("Telegram bot is not configured");
        }
        String token = randomToken();
        tokenRepository.save(new TelegramLinkToken(
                token,
                user,
                OffsetDateTime.now().plusMinutes(30)));
        return "https://t.me/" + settings.username() + "?start=link_" + token;
    }

    @Transactional
    public String consume(String token, long telegramId) {
        TelegramLinkToken link = tokenRepository.findById(token)
                .orElseThrow(() -> new IllegalArgumentException("This connect link is invalid"));
        if (link.getUsedAt() != null) {
            throw new IllegalArgumentException("This connect link was already used");
        }
        if (!OffsetDateTime.now().isBefore(link.getExpiresAt())) {
            throw new IllegalArgumentException("This connect link has expired");
        }

        userRepository.findByTelegramId(telegramId).ifPresent(other -> {
            if (!other.getId().equals(link.getUser().getId())) {
                other.setTelegramId(null);
                userRepository.saveAndFlush(other);
            }
        });

        User user = userRepository.findByIdForUpdate(link.getUser().getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setTelegramId(telegramId);
        link.setUsedAt(OffsetDateTime.now());
        return user.getUsername();
    }

    private String randomToken() {
        StringBuilder token = new StringBuilder();
        for (int i = 0; i < 20; i++) {
            token.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        if (tokenRepository.existsById(token.toString())) {
            return randomToken();
        }
        return token.toString();
    }
}
