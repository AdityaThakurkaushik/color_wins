package com.example.demo.service;

import com.example.demo.dto.NotificationRequest;
import com.example.demo.entity.Deposit;
import com.example.demo.entity.PaymentMethod;
import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.User;
import com.example.demo.repository.DepositRepository;
import com.example.demo.repository.PaymentMethodRepository;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class DepositService {

    private static final long MIN_AMOUNT = 100L;
    private static final long MAX_AMOUNT = 5000L;
    private static final int EXPIRY_MINUTES = 15;
    private static final int MAX_OPEN = 3;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final DepositRepository depositRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final UserRepository userRepository;
    private final PointsTransactionRepository pointsTransactionRepository;
    private final NotificationService notificationService;

    public DepositService(
            DepositRepository depositRepository,
            PaymentMethodRepository paymentMethodRepository,
            UserRepository userRepository,
            PointsTransactionRepository pointsTransactionRepository,
            NotificationService notificationService) {
        this.depositRepository = depositRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.userRepository = userRepository;
        this.pointsTransactionRepository = pointsTransactionRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public Deposit create(Long userId, long amount) {
        expireOld();

        if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
            throw new IllegalArgumentException("Amount must be between 100 and 5000");
        }

        long open = depositRepository.countByUserIdAndStatusIn(
                userId, List.of("PENDING", "SUBMITTED"));
        if (open >= MAX_OPEN) {
            throw new IllegalArgumentException("Finish your open deposit requests first");
        }

        PaymentMethod method = currentMethod();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Deposit deposit = new Deposit(
                newPublicId(),
                user,
                method,
                amount,
                OffsetDateTime.now().plusMinutes(EXPIRY_MINUTES));
        return depositRepository.save(deposit);
    }

    @Transactional
    public List<Deposit> listForUser(Long userId) {
        expireOld();
        List<Deposit> deposits = depositRepository.findByUserIdOrderByCreatedAtDesc(userId);
        useCurrentMethod(deposits);
        return deposits;
    }

    @Transactional(readOnly = true)
    public PaymentMethod activeMethod() {
        return currentMethod();
    }

    @Transactional
    public Deposit getForUser(Long userId, String publicId) {
        expireOld();
        Deposit deposit = depositRepository.findByPublicId(publicId)
                .orElseThrow(() -> new IllegalArgumentException("Deposit not found"));
        if (!deposit.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Deposit not found");
        }
        useCurrentMethod(List.of(deposit));
        return deposit;
    }

    @Transactional
    public Deposit submitUtr(Long userId, String publicId, String rawUtr) {
        expireOld();
        String utr = normalizeUtr(rawUtr);

        Deposit deposit = depositRepository.findByPublicIdForUpdate(publicId)
                .orElseThrow(() -> new IllegalArgumentException("Deposit not found"));

        if (!deposit.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Deposit not found");
        }
        if (!"PENDING".equals(deposit.getStatus())) {
            throw new IllegalArgumentException("This deposit is not waiting for a UTR");
        }
        if (!OffsetDateTime.now().isBefore(deposit.getExpiresAt())) {
            deposit.expire();
            throw new IllegalArgumentException("This deposit has expired");
        }
        depositRepository.findByUtr(utr).ifPresent(existing -> {
            if (existing.getId().equals(deposit.getId())) {
                return;
            }
            if ("REJECTED".equals(existing.getStatus()) || "EXPIRED".equals(existing.getStatus())) {
                existing.clearUtr();
                depositRepository.saveAndFlush(existing);
                return;
            }
            throw new IllegalArgumentException(
                    "This UTR is already on " + existing.getPublicId() + " (" + existing.getStatus() + ")");
        });

        deposit.submitUtr(utr);
        return deposit;
    }

    @Transactional(readOnly = true)
    public List<Deposit> listSubmitted() {
        return depositRepository.findByStatusOrderByCreatedAtAsc("SUBMITTED");
    }

    @Transactional
    public Deposit approve(String publicId) {
        Deposit deposit = depositRepository.findByPublicIdForUpdate(publicId)
                .orElseThrow(() -> new IllegalArgumentException("Deposit not found"));

        if (!"SUBMITTED".equals(deposit.getStatus())) {
            throw new IllegalArgumentException("Only a submitted deposit can be approved");
        }

        long coins = deposit.getAmountRequested();
        User user = userRepository.findByIdForUpdate(deposit.getUser().getId())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        String key = "DEPOSIT_" + deposit.getPublicId();
        if (pointsTransactionRepository.findByIdempotencyKey(key).isPresent()) {
            throw new IllegalArgumentException("This deposit was already credited");
        }

        user.setVirtualPoints(Math.addExact(user.getVirtualPoints(), coins));
        pointsTransactionRepository.save(new PointsTransaction(
                user,
                coins,
                "DEPOSIT_CREDIT",
                key,
                "Deposit " + deposit.getPublicId() + " approved"));
        deposit.approve(coins);
        notifyUser(user.getId(),
                "Funds added",
                coins + " coins were added to your wallet for " + deposit.getPublicId() + ".");
        return deposit;
    }

    @Transactional
    public Deposit reject(String publicId, String reason) {
        if (reason == null || reason.isBlank() || reason.trim().length() > 255) {
            throw new IllegalArgumentException("A reject reason is required");
        }
        Deposit deposit = depositRepository.findByPublicIdForUpdate(publicId)
                .orElseThrow(() -> new IllegalArgumentException("Deposit not found"));
        if (!"SUBMITTED".equals(deposit.getStatus())) {
            throw new IllegalArgumentException("Only a submitted deposit can be rejected");
        }
        deposit.reject(reason.trim());
        notifyUser(deposit.getUser().getId(),
                "Deposit rejected",
                deposit.getPublicId() + " was rejected. Reason: " + reason.trim());
        return deposit;
    }

    @Transactional
    public PaymentMethod saveMethod(Long id, String label, String upiId, boolean active, int priority) {
        if (label == null || label.isBlank() || label.trim().length() > 40) {
            throw new IllegalArgumentException("Label is required");
        }
        String upi = upiId == null ? "" : upiId.trim();
        if (!upi.matches("^[\\w.\\-]{2,}@[\\w.\\-]{2,}$") || upi.length() > 80) {
            throw new IllegalArgumentException("Enter a valid UPI ID");
        }
        PaymentMethod method = id == null
                ? new PaymentMethod(label.trim(), upi, active, priority)
                : paymentMethodRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Payment method not found"));
        method.setLabel(label.trim());
        method.setUpiId(upi);
        method.setActive(active);
        method.setPriority(priority);
        PaymentMethod saved = paymentMethodRepository.save(method);
        if (saved.isActive()) {
            for (PaymentMethod other : paymentMethodRepository.findAll()) {
                if (!other.getId().equals(saved.getId()) && other.isActive()) {
                    other.setActive(false);
                }
            }
        }
        return saved;
    }

    private PaymentMethod currentMethod() {
        return paymentMethodRepository
                .findFirstByActiveTrueOrderByPriorityDescIdDesc()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Add funds is unavailable. No payment method is active."));
    }

    private void useCurrentMethod(List<Deposit> deposits) {
        PaymentMethod current;
        try {
            current = currentMethod();
        } catch (IllegalArgumentException ex) {
            return;
        }
        for (Deposit deposit : deposits) {
            if ("PENDING".equals(deposit.getStatus())
                    && !current.getId().equals(deposit.getPaymentMethod().getId())) {
                deposit.setPaymentMethod(current);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<PaymentMethod> listMethods() {
        return paymentMethodRepository.findAllByOrderByPriorityDescIdAsc();
    }

    private void notifyUser(Long userId, String title, String message) {
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

    private void expireOld() {
        List<Deposit> expired = depositRepository.findByStatusAndExpiresAtBefore(
                "PENDING", OffsetDateTime.now());
        for (Deposit deposit : expired) {
            deposit.expire();
        }
    }

    private String normalizeUtr(String raw) {
        String utr = raw == null ? "" : raw.replaceAll("[\\s-]", "");
        if (!utr.matches("^[0-9]{12}$") || utr.chars().distinct().count() < 3) {
            throw new IllegalArgumentException("Enter a valid 12-digit UTR");
        }
        return utr;
    }

    private String newPublicId() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder id = new StringBuilder("DEP-");
        for (int i = 0; i < 8; i++) {
            id.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        }
        if (depositRepository.findByPublicId(id.toString()).isPresent()) {
            return newPublicId();
        }
        return id.toString();
    }
}
