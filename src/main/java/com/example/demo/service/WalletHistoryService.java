package com.example.demo.service;

import com.example.demo.dto.NotificationRequest;
import com.example.demo.entity.Deposit;
import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.User;
import com.example.demo.entity.Withdrawal;
import com.example.demo.repository.DepositRepository;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.WithdrawalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

@Service
public class WalletHistoryService {

    private static final long MAX_WITHDRAWAL = 5000L;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PointsTransactionRepository pointsTransactionRepository;
    private final DepositRepository depositRepository;
    private final WithdrawalRepository withdrawalRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final WalletPolicyService walletPolicyService;

    public WalletHistoryService(
            PointsTransactionRepository pointsTransactionRepository,
            DepositRepository depositRepository,
            WithdrawalRepository withdrawalRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            WalletPolicyService walletPolicyService) {
        this.pointsTransactionRepository = pointsTransactionRepository;
        this.depositRepository = depositRepository;
        this.withdrawalRepository = withdrawalRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.walletPolicyService = walletPolicyService;
    }

    @Transactional
    public Withdrawal requestWithdrawal(Long userId, long amount) {
        throw new IllegalArgumentException("Payout details are required for a withdrawal request");
    }

    @Transactional
    public Withdrawal requestWithdrawal(
            Long userId, long amount, String payoutMethod, String accountHolderName,
            String upiId, String bankName, String bankAccountNumber, String bankIfsc) {
        WalletPolicyService.ResolvedPolicy policy = walletPolicyService.resolve(userId);
        if (policy.minWithdrawalEnabled() && amount < policy.minWithdrawalAmount()) {
            throw new IllegalArgumentException(
                    "Withdrawal must be at least " + policy.minWithdrawalAmount());
        }
        if (amount > MAX_WITHDRAWAL) {
            throw new IllegalArgumentException("Withdrawal must be at most " + MAX_WITHDRAWAL);
        }
        if (amount <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be greater than 0");
        }

        String method = payoutMethod == null ? "" : payoutMethod.trim().toUpperCase(Locale.ROOT);
        String holder = accountHolderName == null ? "" : accountHolderName.trim();
        String normalizedUpi = clean(upiId);
        String normalizedBank = clean(bankName);
        String normalizedAccount = clean(bankAccountNumber);
        String normalizedIfsc = bankIfsc == null ? null : bankIfsc.trim().toUpperCase(Locale.ROOT);

        if (holder.isBlank() || holder.length() > 100) {
            throw new IllegalArgumentException("Enter a valid account holder name");
        }
        if ("UPI".equals(method)) {
            if (normalizedUpi == null || normalizedUpi.length() > 100
                    || !normalizedUpi.matches("[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}")) {
                throw new IllegalArgumentException("Enter a valid UPI ID");
            }
            normalizedBank = null;
            normalizedAccount = null;
            normalizedIfsc = null;
        } else if ("BANK".equals(method)) {
            if (normalizedBank == null || normalizedBank.length() > 100
                    || normalizedAccount == null || !normalizedAccount.matches("[0-9]{6,34}")
                    || normalizedIfsc == null || !normalizedIfsc.matches("[A-Z]{4}0[A-Z0-9]{6}")) {
                throw new IllegalArgumentException("Enter valid bank name, account number and IFSC");
            }
            normalizedUpi = null;
        } else {
            throw new IllegalArgumentException("Choose UPI or Bank payout method");
        }

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        walletPolicyService.enforceFirstWithdrawal(userId, policy);
        if (user.getVirtualPoints() < amount) {
            throw new IllegalArgumentException("Insufficient coins");
        }

        Withdrawal withdrawal = withdrawalRepository.save(
                new Withdrawal(newPublicId(), user, amount, method, holder,
                        normalizedUpi, normalizedBank, normalizedAccount, normalizedIfsc));

        user.setVirtualPoints(user.getVirtualPoints() - amount);
        pointsTransactionRepository.save(new PointsTransaction(
                user,
                amount,
                "WITHDRAWAL_DEBIT",
                "WITHDRAWAL_" + withdrawal.getPublicId(),
                "Withdrawal " + withdrawal.getPublicId() + " requested"));
        return withdrawal;
    }

    private String clean(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    @Transactional(readOnly = true)
    public List<Withdrawal> listPendingWithdrawals() {
        return withdrawalRepository.findByStatusOrderByCreatedAtAsc("PENDING");
    }

    @Transactional
    public Withdrawal markPaid(String publicId) {
        Withdrawal withdrawal = locked(publicId);
        if (!"PENDING".equals(withdrawal.getStatus())) {
            throw new IllegalArgumentException("Only a pending withdrawal can be paid");
        }
        withdrawal.markPaid();
        notify(withdrawal.getUser().getId(),
                "Withdrawal paid",
                withdrawal.getAmount() + " coins were paid for " + withdrawal.getPublicId() + ".");
        return withdrawal;
    }

    @Transactional
    public Withdrawal reject(String publicId, String reason) {
        if (reason == null || reason.isBlank() || reason.trim().length() > 255) {
            throw new IllegalArgumentException("A reject reason is required");
        }
        Withdrawal withdrawal = locked(publicId);
        if (!"PENDING".equals(withdrawal.getStatus())) {
            throw new IllegalArgumentException("Only a pending withdrawal can be rejected");
        }

        User user = userRepository.findByIdForUpdate(withdrawal.getUser().getId())
                .orElseThrow(() -> new IllegalStateException("User not found"));
        String key = "WITHDRAWAL_REFUND_" + withdrawal.getPublicId();
        if (pointsTransactionRepository.findByIdempotencyKey(key).isEmpty()) {
            user.setVirtualPoints(Math.addExact(user.getVirtualPoints(), withdrawal.getAmount()));
            pointsTransactionRepository.save(new PointsTransaction(
                    user,
                    withdrawal.getAmount(),
                    "WITHDRAWAL_REFUND",
                    key,
                    "Withdrawal " + withdrawal.getPublicId() + " rejected"));
        }
        withdrawal.reject(reason.trim());
        notify(user.getId(),
                "Withdrawal rejected",
                withdrawal.getPublicId() + " was rejected. Your coins were returned. Reason: " + reason.trim());
        return withdrawal;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> history(Long userId) {
        List<Map<String, Object>> rows = new ArrayList<>();

        for (Deposit deposit : depositRepository.findByUserIdOrderByCreatedAtDesc(userId)) {
            Map<String, Object> row = base(
                    "deposit-" + deposit.getPublicId(),
                    "DEPOSIT",
                    "Deposit",
                    deposit.getAmountRequested(),
                    "IN",
                    deposit.getStatus(),
                    deposit.getCreatedAt(),
                    deposit.getUtr() == null ? deposit.getPublicId() : deposit.getPublicId() + " · " + deposit.getUtr());
            rows.add(row);
        }

        for (Withdrawal withdrawal : withdrawalRepository.findByUserIdOrderByCreatedAtDesc(userId)) {
            rows.add(base(
                    "withdrawal-" + withdrawal.getPublicId(),
                    "WITHDRAWAL",
                    "Withdrawal",
                    withdrawal.getAmount(),
                    "OUT",
                    withdrawal.getStatus(),
                    withdrawal.getCreatedAt(),
                    withdrawal.getRejectReason() == null
                            ? withdrawal.getPublicId()
                            : withdrawal.getPublicId() + " · " + withdrawal.getRejectReason()));
        }

        for (PointsTransaction transaction : pointsTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId)) {
            if ("DEPOSIT_CREDIT".equals(transaction.getTransactionType())
                    || "WITHDRAWAL_DEBIT".equals(transaction.getTransactionType())
                    || "WITHDRAWAL_REFUND".equals(transaction.getTransactionType())) {
                continue;
            }
            boolean incoming = switch (transaction.getTransactionType()) {
                case "BET_DEBIT", "ADMIN_DEBIT" -> false;
                default -> true;
            };
            rows.add(base(
                    "txn-" + transaction.getId(),
                    "GAME",
                    label(transaction.getTransactionType()),
                    transaction.getAmount(),
                    incoming ? "IN" : "OUT",
                    "COMPLETED",
                    transaction.getCreatedAt(),
                    transaction.getDescription()));
        }

        rows.sort(Comparator.comparing((Map<String, Object> row) -> (String) row.get("createdAt")).reversed());
        return rows;
    }

    private Withdrawal locked(String publicId) {
        return withdrawalRepository.findByPublicIdForUpdate(publicId)
                .orElseThrow(() -> new IllegalArgumentException("Withdrawal not found"));
    }

    private void notify(Long userId, String title, String message) {
        NotificationRequest request = new NotificationRequest();
        request.setTitle(title);
        request.setMessage(message);
        request.setPriority("IMPORTANT");
        request.setTargetType("USER");
        request.setTargetUserId(userId);
        request.setScheduledAt(OffsetDateTime.now());
        request.setActive(true);
        notificationService.createNotification(request);
    }

    private Map<String, Object> base(
            String id, String kind, String title, long amount, String direction,
            String status, OffsetDateTime createdAt, String detail) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("kind", kind);
        row.put("title", title);
        row.put("amount", amount);
        row.put("direction", direction);
        row.put("status", status);
        row.put("createdAt", createdAt == null ? "" : createdAt.toString());
        row.put("detail", detail == null ? "" : detail);
        return row;
    }

    private String label(String type) {
        return switch (type) {
            case "SIGNUP_BONUS" -> "Signup bonus";
            case "BET_DEBIT" -> "Bet";
            case "BET_PAYOUT" -> "Bet win";
            case "BET_REFUND" -> "Bet refund";
            case "ADMIN_CREDIT" -> "Admin credit";
            case "ADMIN_DEBIT" -> "Admin debit";
            case "REFERRAL_BONUS" -> "Referral bonus";
            default -> type;
        };
    }

    private String newPublicId() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder id = new StringBuilder("WD-");
        for (int i = 0; i < 8; i++) {
            id.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        }
        if (withdrawalRepository.findByPublicId(id.toString()).isPresent()) {
            return newPublicId();
        }
        return id.toString();
    }
}
