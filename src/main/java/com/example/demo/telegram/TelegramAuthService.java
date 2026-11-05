package com.example.demo.telegram;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;

@Service
public class TelegramAuthService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final TelegramSettings settings;
    private final TelegramLinkTokenRepository tokenRepository;
    private final UserRepository userRepository;

    public TelegramAuthService(
            TelegramSettings settings,
            TelegramLinkTokenRepository tokenRepository,
            UserRepository userRepository) {
        this.settings = settings;
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
    }

    public boolean available() {
        return settings.enabled() && !settings.username().isBlank();
    }

    public String botUsername() {
        return settings.username();
    }

    @Transactional
    public String createVerifyLink(User user) {
        return createLink(user, "verify_");
    }

    @Transactional
    public String createResetLink(User user) {
        return createLink(user, "reset_");
    }

    @Transactional
    public User consumeVerify(String token, long telegramId) {
        User user = consumeToken(token, telegramId);
        return user;
    }

    @Transactional
    public User consumeReset(String token, long telegramId) {
        return consumeToken(token, telegramId);
    }

    private String createLink(User user, String prefix) {
        if (!available()) {
            throw new IllegalArgumentException("Telegram bot is not configured");
        }
        String token = randomToken();
        tokenRepository.saveAndFlush(new TelegramLinkToken(
                token,
                user,
                OffsetDateTime.now().plusMinutes(20)));
        return "https://t.me/" + settings.username() + "?start=" + prefix + token;
    }

    private User consumeToken(String rawToken, long telegramId) {
        String token = rawToken == null ? "" : rawToken.trim().toUpperCase();
        TelegramLinkToken link = tokenRepository.findById(token)
                .orElseThrow(() -> new IllegalArgumentException(
                        "This Telegram link is invalid. Website pe naya Forgot/Verify link open karo."));
        if (link.getUsedAt() != null) {
            // Same Telegram account can retry within expiry to get a fresh reset/verify action.
            User linkedUser = link.getUser();
            if (linkedUser != null
                    && linkedUser.getTelegramId() != null
                    && linkedUser.getTelegramId() == telegramId
                    && OffsetDateTime.now().isBefore(link.getExpiresAt())) {
                return linkedUser;
            }
            throw new IllegalArgumentException("This Telegram link was already used. Website se naya link lo.");
        }
        if (!OffsetDateTime.now().isBefore(link.getExpiresAt())) {
            throw new IllegalArgumentException("This Telegram link has expired. Website se naya link lo.");
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
        return user;
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
