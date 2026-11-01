package com.example.demo.telegram;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class TelegramNotifier {

    private static final Logger log = LoggerFactory.getLogger(TelegramNotifier.class);

    private final TelegramSettings settings;
    private final TelegramClient client;

    public TelegramNotifier(TelegramSettings settings, TelegramClient client) {
        this.settings = settings;
        this.client = client;
    }

    public void depositSubmitted(String publicId, String username, long amount, String utr, String upiId) {
        String text = """
                New deposit to check
                %s
                User: %s
                Amount: %d coins
                Paid to: %s
                UTR: %s
                """.formatted(publicId, username, amount, upiId, utr).strip();
        sendToAdmins(text, "Approve", "a:" + publicId, "Reject", "r:" + publicId);
    }

    public void withdrawalRequested(String publicId, String username, long amount) {
        String text = """
                New withdrawal to check
                %s
                User: %s
                Amount: %d coins
                """.formatted(publicId, username, amount).strip();
        sendToAdmins(text, "Mark paid", "p:" + publicId, "Reject", "x:" + publicId);
    }

    private void sendToAdmins(String text, String okLabel, String okData, String noLabel, String noData) {
        if (!settings.enabled() || settings.adminIds().isEmpty()) {
            return;
        }
        for (Long adminId : settings.adminIds()) {
            try {
                client.send(Outgoing.choice(adminId, text, okLabel, okData, noLabel, noData));
            } catch (RuntimeException ex) {
                log.warn("Could not notify Telegram admin: {}", ex.getMessage());
            }
        }
    }

    public void tellUser(Long telegramId, String text) {
        if (!settings.enabled() || telegramId == null || text == null || text.isBlank()) {
            return;
        }
        try {
            client.send(Outgoing.text(telegramId, text));
        } catch (RuntimeException ex) {
            log.warn("Could not message Telegram user: {}", ex.getMessage());
        }
    }
}
