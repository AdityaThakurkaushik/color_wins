package com.example.demo.telegram;

import com.example.demo.entity.Withdrawal;
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

    public void withdrawalRequested(Withdrawal withdrawal) {
        String payoutDetails;
        if ("UPI".equalsIgnoreCase(withdrawal.getPayoutMethod())) {
            payoutDetails = """
                    Payout method: UPI
                    Account holder: %s
                    UPI ID: %s
                    """.formatted(
                    safe(withdrawal.getAccountHolderName()),
                    safe(withdrawal.getUpiId()));
        } else {
            payoutDetails = """
                    Payout method: Bank
                    Account holder: %s
                    Bank name: %s
                    Account number: %s
                    IFSC: %s
                    """.formatted(
                    safe(withdrawal.getAccountHolderName()),
                    safe(withdrawal.getBankName()),
                    safe(withdrawal.getBankAccountNumber()),
                    safe(withdrawal.getBankIfsc()));
        }

        String text = """
                New withdrawal to check
                %s
                User: %s
                Amount: %d coins
                %s
                """.formatted(
                withdrawal.getPublicId(),
                withdrawal.getUser().getUsername(),
                withdrawal.getAmount(),
                payoutDetails).strip();
        sendToAdmins(text, "Mark paid", "p:" + withdrawal.getPublicId(),
                "Reject", "x:" + withdrawal.getPublicId());
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "Not provided" : value;
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
