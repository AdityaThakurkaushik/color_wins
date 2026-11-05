package com.example.demo.telegram;

import com.example.demo.entity.Deposit;
import com.example.demo.entity.User;
import com.example.demo.entity.Withdrawal;
import com.example.demo.repository.DepositRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.DepositService;
import com.example.demo.service.EmailOtpService;
import com.example.demo.service.RegistrationService;
import com.example.demo.service.WalletHistoryService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class TelegramUpdateService {

    private final TelegramSettings settings;
    private final TelegramLinkService linkService;
    private final TelegramAuthService authService;
    private final TelegramChatRepository chatRepository;
    private final UserRepository userRepository;
    private final DepositRepository depositRepository;
    private final DepositService depositService;
    private final WalletHistoryService walletHistoryService;
    private final RegistrationService registrationService;
    private final EmailOtpService emailOtpService;

    public TelegramUpdateService(
            TelegramSettings settings,
            TelegramLinkService linkService,
            TelegramAuthService authService,
            TelegramChatRepository chatRepository,
            UserRepository userRepository,
            DepositRepository depositRepository,
            DepositService depositService,
            WalletHistoryService walletHistoryService,
            @Lazy RegistrationService registrationService,
            EmailOtpService emailOtpService) {
        this.settings = settings;
        this.linkService = linkService;
        this.authService = authService;
        this.chatRepository = chatRepository;
        this.userRepository = userRepository;
        this.depositRepository = depositRepository;
        this.depositService = depositService;
        this.walletHistoryService = walletHistoryService;
        this.registrationService = registrationService;
        this.emailOtpService = emailOtpService;
    }

    public BotTurn onMessage(long chatId, long fromId, String text) {
        String trimmed = text == null ? "" : text.trim();
        if (trimmed.startsWith("/start")) {
            clearRejectPrompt(chatId);
            String payload = trimmed.replaceFirst("^/start(@\\S+)?", "").trim();
            return onStart(chatId, fromId, payload);
        }
        String pending = chatRepository.findById(chatId)
                .map(TelegramChat::getPendingPublicId)
                .orElse(null);
        if (settings.isAdmin(fromId) && pending != null
                && (pending.startsWith("R:") || pending.startsWith("X:"))) {
            return applyReason(chatId, pending, trimmed);
        }
        if (trimmed.toUpperCase(Locale.ROOT).matches("^[A-Z0-9]{10,22}$")) {
            return onUtr(chatId, fromId, trimmed.toUpperCase(Locale.ROOT));
        }
        return BotTurn.say(chatId,
                "Send the UTR number here after you open the payment from Add Funds.");
    }

    public BotTurn onCallback(long chatId, long fromId, String data) {
        if (!settings.isAdmin(fromId)) {
            return BotTurn.messages("Not allowed", List.of());
        }
        if (data != null && data.matches("^[1-5]:((DEP|WD)-[A-Z0-9]{8})$")) {
            String publicId = data.substring(2);
            String reason = RejectReasons.byNumber(publicId, data.charAt(0) - '0');
            clearRejectPrompt(chatId);
            try {
                return publicId.startsWith("DEP-")
                        ? rejectDeposit(chatId, publicId, reason)
                        : rejectWithdrawal(chatId, publicId, reason);
            } catch (IllegalArgumentException ex) {
                return BotTurn.messages(ex.getMessage(), List.of());
            }
        }
        if (data == null || !data.matches("^[arpx]:((DEP|WD)-[A-Z0-9]{8})$")) {
            return BotTurn.messages("Unknown action", List.of());
        }
        String action = data.substring(0, 1);
        String publicId = data.substring(2);
        try {
            return switch (action) {
                case "a" -> approveDeposit(chatId, publicId);
                case "r" -> askReason(chatId, "R:" + publicId, publicId);
                case "p" -> markPaid(chatId, publicId);
                case "x" -> askReason(chatId, "X:" + publicId, publicId);
                default -> BotTurn.messages("Unknown action", List.of());
            };
        } catch (IllegalArgumentException ex) {
            return BotTurn.messages(ex.getMessage(), List.of());
        }
    }

    private BotTurn onStart(long chatId, long fromId, String payload) {
        if (payload.startsWith("verify_")) {
            try {
                User user = authService.consumeVerify(payload.substring("verify_".length()), fromId);
                registrationService.completeEmailVerification(user.getEmail());
                remember(chatId, user, null);
                return BotTurn.say(chatId,
                        "Millionaire Hub account verified.\n"
                                + "Welcome " + (user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                                + ".\nAb website pe Login karo.");
            } catch (IllegalArgumentException ex) {
                return BotTurn.say(chatId, ex.getMessage());
            }
        }
        if (payload.startsWith("reset_")) {
            try {
                User user = authService.consumeReset(payload.substring("reset_".length()), fromId);
                String code = emailOtpService.issueCode(user.getEmail(), EmailOtpService.PURPOSE_RESET);
                remember(chatId, user, null);
                return BotTurn.say(chatId,
                        "Millionaire Hub password reset code: " + code
                                + "\nYeh code website pe daalo. 10 minute valid hai.");
            } catch (IllegalArgumentException ex) {
                return BotTurn.say(chatId, ex.getMessage());
            }
        }
        if (payload.startsWith("link_")) {
            try {
                String username = linkService.consume(payload.substring("link_".length()), fromId);
                remember(chatId, userRepository.findByTelegramId(fromId).orElseThrow(), null);
                return BotTurn.say(chatId, "Connected as " + username + ".\nOpen Add Funds, pay, then send the UTR here.");
            } catch (IllegalArgumentException ex) {
                return BotTurn.say(chatId, ex.getMessage());
            }
        }
        if (payload.startsWith("DEP-")) {
            Optional<User> linked = userRepository.findByTelegramId(fromId);
            if (linked.isEmpty()) {
                return BotTurn.say(chatId, "First connect Telegram from Add Funds on the website.");
            }
            Deposit deposit = depositRepository.findByPublicId(payload).orElse(null);
            if (deposit == null || !deposit.getUser().getId().equals(linked.get().getId())) {
                return BotTurn.say(chatId, "This payment is not for your account.");
            }
            if (!"PENDING".equals(deposit.getStatus())) {
                return BotTurn.say(chatId, deposit.getPublicId() + " is already " + deposit.getStatus().toLowerCase(Locale.ROOT) + ".");
            }
            remember(chatId, linked.get(), deposit.getPublicId());
            return BotTurn.say(chatId,
                    deposit.getPublicId() + "\nAmount: " + deposit.getAmountRequested()
                            + " coins\nPay the UPI on the website, then send the UTR here.");
        }
        if (payload == null || payload.isBlank()) {
            return BotTurn.say(chatId,
                    "Millionaire Hub bot ready.\n"
                            + "Password reset / verify ke liye website wala Open Telegram button use karo.\n"
                            + "Yahan sirf /start mat bhejo — deep link se Start dabao.");
        }
        return BotTurn.say(chatId,
                "Unknown start link.\nWebsite se naya Forgot Password / Verify link open karo.");
    }

    private BotTurn onUtr(long chatId, long fromId, String utr) {
        User user = userRepository.findByTelegramId(fromId).orElse(null);
        if (user == null) {
            return BotTurn.say(chatId, "First connect Telegram from Add Funds on the website.");
        }
        String publicId = chatRepository.findById(chatId)
                .map(TelegramChat::getPendingPublicId)
                .orElse(null);
        if (publicId == null) {
            List<Deposit> open = openDeposits(user.getId());
            if (open.size() == 1) {
                publicId = open.get(0).getPublicId();
            } else if (open.isEmpty()) {
                return BotTurn.say(chatId, "No open payment. Create one in Add Funds, then send the UTR here.");
            } else {
                return BotTurn.say(chatId, "You have more than one open payment. Open the correct one from Add Funds.");
            }
        }
        if (publicId.startsWith("R:") || publicId.startsWith("X:")) {
            return BotTurn.say(chatId, "Send the UTR number here after you open the payment from Add Funds.");
        }
        try {
            Deposit deposit = depositService.submitUtr(user.getId(), publicId, utr);
            remember(chatId, user, null);
            List<Outgoing> messages = new ArrayList<>();
            messages.add(Outgoing.text(chatId,
                    "UTR/UPI transaction ID submitted successfully. Admin will approve as soon as possible. Thank you 🥰"));
            for (Long adminId : settings.adminIds()) {
                messages.add(Outgoing.choice(
                        adminId,
                        """
                                New deposit to check
                                %s
                                User: %s
                                Amount: %d coins
                                Paid to: %s
                                UTR: %s
                                """.formatted(
                                deposit.getPublicId(),
                                user.getUsername(),
                                deposit.getAmountRequested(),
                                deposit.getPaymentMethod().getUpiId(),
                                deposit.getUtr()).strip(),
                        "Approve", "a:" + deposit.getPublicId(),
                        "Reject", "r:" + deposit.getPublicId()));
            }
            return new BotTurn(null, messages);
        } catch (IllegalArgumentException ex) {
            return BotTurn.say(chatId, ex.getMessage());
        }
    }

    private BotTurn approveDeposit(long adminChatId, String publicId) {
        Deposit deposit = depositService.approve(publicId);
        User owner = userRepository.findById(deposit.getUser().getId()).orElseThrow();
        clearRejectPrompt(adminChatId);
        return decided(
                adminChatId,
                publicId + " approved.\n" + deposit.getAmountConfirmed() + " coins added once.",
                owner.getTelegramId(),
                publicId + " approved.\n" + deposit.getAmountConfirmed() + " coins were added to your wallet.");
    }

    private BotTurn askReason(long chatId, String code, String publicId) {
        TelegramChat chat = chatRepository.findById(chatId).orElseGet(() -> new TelegramChat(chatId));
        chat.setPendingPublicId(code);
        chatRepository.save(chat);
        return new BotTurn(null, List.of(Outgoing.reasons(
                chatId,
                "Choose a reason for " + publicId + ", or reply with your own.\nThe user will see it.",
                publicId)));
    }

    private BotTurn applyReason(long chatId, String pending, String reason) {
        String clean = reason == null ? "" : reason.trim();
        if (clean.length() < 3 || clean.length() > 255) {
            return BotTurn.say(chatId, "Send one reason, 3 to 255 characters. The user will see it.");
        }
        String publicId = pending.substring(2);
        try {
            if (pending.startsWith("R:")) {
                return rejectDeposit(chatId, publicId, clean);
            }
            return rejectWithdrawal(chatId, publicId, clean);
        } catch (IllegalArgumentException ex) {
            clearRejectPrompt(chatId);
            return BotTurn.say(chatId, ex.getMessage());
        }
    }

    private BotTurn rejectDeposit(long chatId, String publicId, String reason) {
        Deposit deposit = depositService.reject(publicId, reason);
        User owner = userRepository.findById(deposit.getUser().getId()).orElseThrow();
        clearRejectPrompt(chatId);
        return decided(
                chatId,
                publicId + " rejected.\nThe user was notified.\nReason: " + reason,
                owner.getTelegramId(),
                publicId + " was rejected.\nReason: " + reason);
    }

    private BotTurn rejectWithdrawal(long chatId, String publicId, String reason) {
        Withdrawal withdrawal = walletHistoryService.reject(publicId, reason);
        User owner = userRepository.findById(withdrawal.getUser().getId()).orElseThrow();
        clearRejectPrompt(chatId);
        return decided(
                chatId,
                publicId + " rejected.\nCoins were returned.\nReason: " + reason,
                owner.getTelegramId(),
                publicId + " was rejected. Your coins were returned.\nReason: " + reason);
    }

    private BotTurn markPaid(long adminChatId, String publicId) {
        Withdrawal withdrawal = walletHistoryService.markPaid(publicId);
        User owner = userRepository.findById(withdrawal.getUser().getId()).orElseThrow();
        clearRejectPrompt(adminChatId);
        return decided(
                adminChatId,
                publicId + " marked paid.",
                owner.getTelegramId(),
                publicId + " was paid.\n" + withdrawal.getAmount() + " coins were sent.");
    }

    private BotTurn decided(long adminChatId, String adminText, Long userTelegramId, String userText) {
        List<Outgoing> messages = new ArrayList<>();
        messages.add(Outgoing.text(adminChatId, adminText));
        if (userTelegramId != null) {
            messages.add(Outgoing.text(userTelegramId, userText));
        }
        return BotTurn.messages("Updated", messages);
    }

    private List<Deposit> openDeposits(Long userId) {
        return depositRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(deposit -> "PENDING".equals(deposit.getStatus()))
                .filter(deposit -> OffsetDateTime.now().isBefore(deposit.getExpiresAt()))
                .toList();
    }

    private void clearRejectPrompt(long chatId) {
        chatRepository.findById(chatId).ifPresent(chat -> {
            String pending = chat.getPendingPublicId();
            if (pending != null && (pending.startsWith("R:") || pending.startsWith("X:"))) {
                chat.setPendingPublicId(null);
                chatRepository.save(chat);
            }
        });
    }

    private void remember(long chatId, User user, String publicId) {
        TelegramChat chat = chatRepository.findById(chatId).orElseGet(() -> new TelegramChat(chatId));
        chat.setUser(user);
        chat.setPendingPublicId(publicId);
        chatRepository.save(chat);
    }
}
