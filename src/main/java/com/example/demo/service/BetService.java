package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class BetService {
    private final BetRepository betRepository;
    private final GameRoundRepository gameRoundRepository;
    private final GameControlRepository gameControlRepository;
    private final PointsTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final SystemWalletService systemWalletService;

    public BetService(BetRepository betRepository, GameRoundRepository gameRoundRepository,
            GameControlRepository gameControlRepository, PointsTransactionRepository transactionRepository,
            UserRepository userRepository, SystemWalletService systemWalletService) {
        this.betRepository = betRepository;
        this.gameRoundRepository = gameRoundRepository;
        this.gameControlRepository = gameControlRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.systemWalletService = systemWalletService;
    }

    @Transactional
    public Bet placeColorBet(Long userId, String periodNumber, String color, Long amount) {
        if (userId == null || periodNumber == null || periodNumber.isBlank())
            throw new IllegalArgumentException("User and period are required");
        if (amount == null || amount <= 0)
            throw new IllegalArgumentException("Bet amount must be positive");
        String selectedColor = normalizeColor(color);
        if (!isValidColor(selectedColor))
            throw new IllegalArgumentException("Invalid color selection");

        GameControl control = gameControlRepository.findByIdForUpdate((short) 1)
                .orElseThrow(() -> new IllegalStateException("Game control state not initialized"));
        if (!"RUNNING".equals(control.getState()))
            throw new IllegalArgumentException("Game is not accepting bets");

        GameRound round = gameRoundRepository.findByPeriodNumber(periodNumber)
                .map(found -> gameRoundRepository.findByIdForUpdate(found.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Round not found")))
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));

        // Use the same round-before-user lock order as settlement to avoid
        // deadlocks between a bet placement and its round's settlement.
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!user.isActive()) throw new IllegalArgumentException("User account is inactive");

        OffsetDateTime now = OffsetDateTime.now();
        if (!"OPEN".equals(round.getStatus()) || now.isBefore(round.getStartsAt())
                || !now.isBefore(round.getEndsAt()))
            throw new IllegalArgumentException("Round is not accepting bets");
        if (user.getVirtualPoints() == null || user.getVirtualPoints() < amount)
            throw new IllegalArgumentException("Insufficient virtual points");

        user.setVirtualPoints(user.getVirtualPoints() - amount);
        Bet bet = betRepository.save(new Bet(user, round, "COLOR", selectedColor, null, amount));
        transactionRepository.save(new PointsTransaction(user, amount, "BET_DEBIT",
                "BET_DEBIT_" + UUID.randomUUID(), "Virtual points deducted for color bet"));
        return bet;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getColorSummary(String periodNumber) {
        if (periodNumber == null || periodNumber.isBlank())
            throw new IllegalArgumentException("Period number is required");
        GameRound round = gameRoundRepository.findByPeriodNumber(periodNumber)
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));
        Map<String, Object> summary = new LinkedHashMap<>();
        for (String color : List.of("RED", "GREEN", "VIOLET")) {
            Long total = betRepository.sumPendingAmountByRoundAndColor(round.getId(), color);
            Long players = betRepository.countPendingPlayersByRoundAndColor(round.getId(), color);
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("totalVirtualPoints", total == null ? 0L : total);
            data.put("playerCount", players == null ? 0L : players);
            summary.put(color, data);
        }
        summary.put("periodNumber", round.getPeriodNumber());
        summary.put("status", round.getStatus());
        return summary;
    }

    @Transactional
    public void settleRound(Long roundId, String resultColor) {
        String result = normalizeColor(resultColor);
        if (!isValidColor(result)) throw new IllegalArgumentException("Invalid result color");

        GameRound round = gameRoundRepository.findByIdForUpdate(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Round not found"));
        if (!"RESULT_DECLARED".equals(round.getStatus()))
            throw new IllegalArgumentException("Round result must be declared before settlement");
        if (!"PENDING".equals(round.getSettlementStatus()))
            throw new IllegalArgumentException("Round settlement already completed");

        List<Bet> bets = betRepository.findByRoundIdForUpdate(roundId).stream()
                .filter(b -> "PENDING".equals(b.getStatus())).toList();

        long totalPool = 0L;
        Set<Long> playerIds = new HashSet<>();
        List<Bet> winningBets = new ArrayList<>();
        long winningStake = 0L;

        for (Bet bet : bets) {
            totalPool = Math.addExact(totalPool, bet.getAmount());
            playerIds.add(bet.getUser().getId());
            if (result.equals(normalizeColor(bet.getSelectedColor()))) {
                winningBets.add(bet);
                winningStake = Math.addExact(winningStake, bet.getAmount());
            }
        }

        if (bets.isEmpty()) {
            round.completeSettlement(0L, 0L, 0L);
            return;
        }

        if (playerIds.size() == 1) {
            if (!settleSinglePlayer(round, bets, totalPool)) {
                cancelAndRefundRound(round, bets, totalPool);
                return;
            }
            round.completeSettlement(totalPool, 0L, totalPool);
            return;
        }

        if (winningBets.isEmpty()) {
            for (Bet bet : bets) {
                bet.markLost();
                betRepository.save(bet);
            }
            systemWalletService.creditAdminForRound(round, totalPool, "NO_WINNER_POOL_CREDIT");
            round.completeSettlement(totalPool, 0L, 0L);
            return;
        }

        long commission = BigDecimal.valueOf(totalPool)
                .multiply(round.getCommissionPercent())
                .divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP).longValueExact();
        long winningPool = Math.subtractExact(totalPool, commission);

        Map<Long, Long> payoutsByUser = new HashMap<>();
        long allocated = 0L;
        for (int i = 0; i < winningBets.size(); i++) {
            Bet bet = winningBets.get(i);
            long payout;
            if (i == winningBets.size() - 1) {
                payout = winningPool - allocated;
            } else {
                payout = BigDecimal.valueOf(bet.getAmount())
                        .multiply(BigDecimal.valueOf(winningPool))
                        .divide(BigDecimal.valueOf(winningStake), 0, RoundingMode.DOWN)
                        .longValueExact();
                allocated = Math.addExact(allocated, payout);
            }
            bet.markWon(payout);
            betRepository.save(bet);
            payoutsByUser.merge(bet.getUser().getId(), payout, Math::addExact);
        }

        for (Bet bet : bets) {
            if (!result.equals(normalizeColor(bet.getSelectedColor()))) {
                bet.markLost();
                betRepository.save(bet);
            }
        }

        creditUsers(payoutsByUser, round.getId());
        systemWalletService.creditAdminForRound(round, commission, "COMMISSION_CREDIT");
        round.completeSettlement(totalPool, commission, winningPool);
    }

    private boolean settleSinglePlayer(GameRound round, List<Bet> bets, long totalStake) {
        long bonus = BigDecimal.valueOf(totalStake)
                .multiply(new BigDecimal("0.25"))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
        long totalPayout = Math.addExact(totalStake, bonus);
        if (!systemWalletService.debitPlatformForRound(round, bonus)) return false;

        Long userId = bets.get(0).getUser().getId();
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setVirtualPoints(Math.addExact(user.getVirtualPoints(), totalPayout));
        transactionRepository.save(new PointsTransaction(user, totalPayout, "BET_PAYOUT",
                "ROUND_" + round.getId() + "_SINGLE_PLAYER_" + userId,
                "Stake return plus 25% single-player reward"));

        long allocatedBonus = 0L;
        for (int i = 0; i < bets.size(); i++) {
            Bet bet = bets.get(i);
            long bonusShare;
            if (i == bets.size() - 1) {
                bonusShare = bonus - allocatedBonus;
            } else {
                bonusShare = BigDecimal.valueOf(bet.getAmount())
                        .multiply(BigDecimal.valueOf(bonus))
                        .divide(BigDecimal.valueOf(totalStake), 0, RoundingMode.DOWN)
                        .longValueExact();
                allocatedBonus = Math.addExact(allocatedBonus, bonusShare);
            }
            long betPayout = Math.addExact(bet.getAmount(), bonusShare);
            bet.markWon(betPayout);
            betRepository.save(bet);
        }
        return true;
    }

    private void cancelAndRefundRound(GameRound round, List<Bet> bets, long totalPool) {
        Map<Long, Long> refundsByUser = new HashMap<>();
        for (Bet bet : bets) {
            refundsByUser.merge(bet.getUser().getId(), bet.getAmount(), Math::addExact);
        }

        for (Long userId : refundsByUser.keySet().stream().sorted().toList()) {
            User user = userRepository.findByIdForUpdate(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            long refund = refundsByUser.get(userId);
            user.setVirtualPoints(Math.addExact(user.getVirtualPoints(), refund));
            transactionRepository.save(new PointsTransaction(user, refund, "BET_REFUND",
                    "ROUND_" + round.getId() + "_REFUND_USER_" + userId,
                    "Stake refunded because the round was cancelled: insufficient Platform Wallet balance"));
        }

        for (Bet bet : bets) {
            bet.markRefunded();
            betRepository.save(bet);
        }
        round.completeCancellation(totalPool);
    }

    private void creditUsers(Map<Long, Long> payouts, Long roundId) {
        List<Long> userIds = payouts.keySet().stream().sorted().toList();
        for (Long userId : userIds) {
            long payout = payouts.get(userId);
            if (payout <= 0) continue;
            User user = userRepository.findByIdForUpdate(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            user.setVirtualPoints(Math.addExact(user.getVirtualPoints(), payout));
            transactionRepository.save(new PointsTransaction(user, payout, "BET_PAYOUT",
                    "ROUND_" + roundId + "_PAYOUT_USER_" + userId,
                    "Proportional winning pool payout"));
        }
    }

    private String normalizeColor(String color) {
        return color == null ? "" : color.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isValidColor(String color) {
        return List.of("RED", "GREEN", "VIOLET").contains(color);
    }
}
