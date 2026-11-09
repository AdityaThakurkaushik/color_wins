package com.example.demo.service;

import com.example.demo.entity.PlatformWallet;
import com.example.demo.entity.PlatformWalletTransaction;
import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.Spin;
import com.example.demo.entity.SpinSettings;
import com.example.demo.entity.User;
import com.example.demo.repository.PlatformWalletRepository;
import com.example.demo.repository.PlatformWalletTransactionRepository;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.SpinRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SpinService {

    private final SpinRepository spinRepository;
    private final SpinSettingsService spinSettingsService;
    private final UserRepository userRepository;
    private final PointsTransactionRepository pointsTransactionRepository;
    private final PlatformWalletRepository platformWalletRepository;
    private final PlatformWalletTransactionRepository platformWalletTransactionRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public SpinService(
            SpinRepository spinRepository,
            SpinSettingsService spinSettingsService,
            UserRepository userRepository,
            PointsTransactionRepository pointsTransactionRepository,
            PlatformWalletRepository platformWalletRepository,
            PlatformWalletTransactionRepository platformWalletTransactionRepository) {
        this.spinRepository = spinRepository;
        this.spinSettingsService = spinSettingsService;
        this.userRepository = userRepository;
        this.pointsTransactionRepository = pointsTransactionRepository;
        this.platformWalletRepository = platformWalletRepository;
        this.platformWalletTransactionRepository = platformWalletTransactionRepository;
    }

    static void validateSpinAmount(Long amount, long minBet, long maxBet) {
        if (amount == null || amount < minBet) {
            throw new IllegalArgumentException("Minimum spin bet is " + minBet + " points.");
        }
        if (amount % 5L != 0L) {
            throw new IllegalArgumentException("Spin bet must be a multiple of 5.");
        }
        if (amount > maxBet) {
            throw new IllegalArgumentException(
                    "Spin bet must be between " + minBet + " and " + maxBet + " tokens.");
        }
    }

    static long payoutFor(long amount, BigDecimal multiplier) {
        return BigDecimal.valueOf(amount)
                .multiply(multiplier)
                .setScale(0, RoundingMode.UNNECESSARY)
                .longValueExact();
    }

    @Transactional
    public Map<String, Object> placeSpin(Long userId, Long amount) {
        // Strict rule: every spin reads admin settings from DB — no hardcoded multipliers.
        SpinSettings settings = spinSettingsService.requireSettings();
        if (!settings.isEnabled()) {
            throw new IllegalArgumentException("XpinR is currently disabled by admin.");
        }

        List<BigDecimal> multipliers = SpinSettingsService.parseAndValidateMultipliers(settings.getMultipliers());
        long minBet = settings.getMinBet();
        long maxBet = settings.getMaxBet();
        validateSpinAmount(amount, minBet, maxBet);

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.isActive()) {
            throw new IllegalArgumentException("User account is inactive");
        }

        if (user.getVirtualPoints() == null || user.getVirtualPoints() < amount) {
            throw new IllegalArgumentException("You do not have enough virtual points.");
        }

        int segmentIndex = secureRandom.nextInt(multipliers.size());
        BigDecimal multiplier = multipliers.get(segmentIndex);
        long payout = payoutFor(amount, multiplier);
        long net = payout - amount;

        user.setVirtualPoints(user.getVirtualPoints() - amount);

        Spin spin = spinRepository.saveAndFlush(new Spin(
                user,
                amount,
                (short) segmentIndex,
                multiplier,
                payout,
                net
        ));

        pointsTransactionRepository.save(new PointsTransaction(
                user,
                amount,
                "SPIN_DEBIT",
                "SPIN_DEBIT_" + spin.getId(),
                "Virtual points deducted for XpinR spin"
        ));

        if (payout > 0) {
            user.setVirtualPoints(user.getVirtualPoints() + payout);
            pointsTransactionRepository.save(new PointsTransaction(
                    user,
                    payout,
                    "SPIN_PAYOUT",
                    "SPIN_PAYOUT_" + spin.getId(),
                    "XpinR spin payout " + multiplier.stripTrailingZeros().toPlainString() + "x"
            ));
        }

        long houseTake = amount - payout;
        if (houseTake > 0) {
            creditPlatformWallet(
                    houseTake,
                    "SPIN_HOUSE",
                    spin.getId(),
                    "SPIN_HOUSE_" + spin.getId(),
                    "XpinR house edge take"
            );
        } else if (houseTake < 0) {
            debitPlatformWalletSoft(
                    -houseTake,
                    "SPIN_PAYOUT",
                    spin.getId(),
                    "SPIN_PLATFORM_PAY_" + spin.getId(),
                    "XpinR player win above stake"
            );
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "SUCCESS");
        body.put("spinId", spin.getId());
        body.put("amount", amount);
        body.put("segmentIndex", segmentIndex);
        body.put("multiplier", multiplier);
        body.put("label", SpinSettingsService.labelFor(multiplier));
        body.put("payout", payout);
        body.put("net", net);
        body.put("updatedBalance", user.getVirtualPoints());
        body.put("won", payout > 0);
        body.put("settingsVersion", settings.getUpdatedAt());
        return body;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> recentSpins(Long userId, int limit) {
        int size = Math.max(1, Math.min(limit, 20));
        List<Spin> spins = spinRepository.findByUserIdOrderByCreatedAtDesc(
                userId,
                PageRequest.of(0, size)
        );
        return mapSpins(spins);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminOverview(int recentLimit) {
        Map<String, Object> settings = spinSettingsService.publicConfig();
        Map<String, Object> stats = adminStats();
        List<Map<String, Object>> recent = mapSpins(
                spinRepository.findAllByOrderByCreatedAtDesc(
                        PageRequest.of(0, Math.max(1, Math.min(recentLimit, 50)))
                )
        );

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "SUCCESS");
        body.put("settings", settings);
        body.put("stats", stats);
        body.put("recentSpins", recent);
        body.put("rule", "Spins use admin multipliers from spin_settings only. Client cannot override.");
        return body;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminStats() {
        Object[] totals = asRow(spinRepository.aggregateTotals(), 4);
        Object[] winLoss = asRow(spinRepository.aggregateWinLossCounts(), 2);

        long wagered = toLong(totals[0]);
        long paid = toLong(totals[1]);
        long netPlayer = toLong(totals[2]);
        long count = toLong(totals[3]);
        long losses = toLong(winLoss[0]);
        long wins = toLong(winLoss[1]);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalSpins", count);
        stats.put("totalWagered", wagered);
        stats.put("totalPaid", paid);
        stats.put("playerNet", netPlayer);
        stats.put("houseNet", -netPlayer);
        stats.put("winCount", wins);
        stats.put("lossCount", losses);
        if (wagered > 0) {
            BigDecimal realizedRtp = BigDecimal.valueOf(paid)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(wagered), 2, RoundingMode.HALF_UP);
            stats.put("realizedRtpPercent", realizedRtp);
            stats.put("realizedEdgePercent", BigDecimal.valueOf(100).subtract(realizedRtp));
        } else {
            stats.put("realizedRtpPercent", null);
            stats.put("realizedEdgePercent", null);
        }
        return stats;
    }

    private List<Map<String, Object>> mapSpins(List<Spin> spins) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Spin spin : spins) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("spinId", spin.getId());
            if (spin.getUser() != null) {
                row.put("userId", spin.getUser().getId());
                row.put("username", spin.getUser().getUsername());
            }
            row.put("amount", spin.getAmount());
            row.put("segmentIndex", spin.getSegmentIndex());
            row.put("multiplier", spin.getMultiplier());
            row.put("label", SpinSettingsService.labelFor(spin.getMultiplier()));
            row.put("payout", spin.getPayout());
            row.put("net", spin.getNet());
            row.put("createdAt", spin.getCreatedAt());
            rows.add(row);
        }
        return rows;
    }

    private static Object[] asRow(Object raw, int expected) {
        if (raw == null) {
            return new Object[expected];
        }
        if (raw instanceof Object[] arr) {
            if (arr.length == expected) {
                return arr;
            }
            if (arr.length == 1 && arr[0] instanceof Object[] nested) {
                return nested;
            }
        }
        throw new IllegalStateException("Unexpected aggregate shape");
    }

    private static long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private void creditPlatformWallet(
            long amount,
            String transactionType,
            Long spinId,
            String idempotencyKey,
            String description) {
        if (amount <= 0) {
            return;
        }
        if (platformWalletTransactionRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return;
        }
        PlatformWallet wallet = platformWalletRepository.findByIdForUpdate((short) 1)
                .orElseThrow(() -> new IllegalStateException("Platform wallet not found"));
        wallet.credit(amount);
        platformWalletTransactionRepository.save(new PlatformWalletTransaction(
                amount,
                transactionType,
                spinId,
                idempotencyKey,
                description
        ));
    }

    private void debitPlatformWalletSoft(
            long amount,
            String transactionType,
            Long spinId,
            String idempotencyKey,
            String description) {
        if (amount <= 0) {
            return;
        }
        if (platformWalletTransactionRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return;
        }
        PlatformWallet wallet = platformWalletRepository.findByIdForUpdate((short) 1)
                .orElseThrow(() -> new IllegalStateException("Platform wallet not found"));
        if (wallet.getBalance() < amount) {
            return;
        }
        wallet.debit(amount);
        platformWalletTransactionRepository.save(new PlatformWalletTransaction(
                amount,
                transactionType,
                spinId,
                idempotencyKey,
                description
        ));
    }
}
