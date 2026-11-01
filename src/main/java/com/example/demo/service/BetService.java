// package com.example.demo.service;

// import com.example.demo.entity.Bet;
// import com.example.demo.entity.GameControl;
// import com.example.demo.entity.GameRound;
// import com.example.demo.entity.PointsTransaction;
// import com.example.demo.entity.User;
// import com.example.demo.repository.BetRepository;
// import com.example.demo.repository.GameControlRepository;
// import com.example.demo.repository.GameRoundRepository;
// import com.example.demo.repository.PointsTransactionRepository;
// import com.example.demo.repository.UserRepository;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;

// import java.time.OffsetDateTime;
// import java.util.LinkedHashMap;
// import java.util.List;
// import java.util.Locale;
// import java.util.Map;
// import java.util.UUID;

// @Service
// public class BetService {

//     private static final long PAYOUT_MULTIPLIER = 2L;

//     private final BetRepository betRepository;
//     private final GameRoundRepository gameRoundRepository;
//     private final GameControlRepository gameControlRepository;
//     private final PointsTransactionRepository transactionRepository;
//     private final UserRepository userRepository;

//     public BetService(
//             BetRepository betRepository,
//             GameRoundRepository gameRoundRepository,
//             GameControlRepository gameControlRepository,
//             PointsTransactionRepository transactionRepository,
//             UserRepository userRepository) {
//         this.betRepository = betRepository;
//         this.gameRoundRepository = gameRoundRepository;
//         this.gameControlRepository = gameControlRepository;
//         this.transactionRepository = transactionRepository;
//         this.userRepository = userRepository;
//     }

//     @Transactional
//     public Bet placeColorBet(
//             Long userId, String periodNumber, String color, Long amount) {

//         if (userId == null || periodNumber == null
//                 || periodNumber.isBlank()) {
//             throw new IllegalArgumentException(
//                     "User and period are required");
//         }

//         if (amount == null || amount <= 0) {
//             throw new IllegalArgumentException(
//                     "Bet amount must be positive");
//         }

//         String selectedColor = normalizeColor(color);

//         if (!isValidColor(selectedColor)) {
//             throw new IllegalArgumentException(
//                     "Invalid color selection");
//         }

//         // Lock game control first. This serializes bet placement
//         // with Pause, Stop and scheduler state changes.
//         GameControl control = gameControlRepository
//                 .findByIdForUpdate((short) 1)
//                 .orElseThrow(() -> new IllegalStateException(
//                         "Game control state not initialized"));

//         if (!"RUNNING".equals(control.getState())) {
//             throw new IllegalArgumentException(
//                     "Game is not accepting bets");
//         }

//         User user = userRepository.findByIdForUpdate(userId)
//                 .orElseThrow(() ->
//                         new IllegalArgumentException("User not found"));

//         if (!user.isActive()) {
//             throw new IllegalArgumentException(
//                     "User account is inactive");
//         }

//         GameRound round = gameRoundRepository
//                 .findByPeriodNumber(periodNumber)
//                 .map(found -> gameRoundRepository
//                         .findByIdForUpdate(found.getId())
//                         .orElseThrow(() ->
//                                 new IllegalArgumentException(
//                                         "Round not found")))
//                 .orElseThrow(() ->
//                         new IllegalArgumentException("Round not found"));

//         OffsetDateTime now = OffsetDateTime.now();

//         if (!"OPEN".equals(round.getStatus())
//                 || now.isBefore(round.getStartsAt())
//                 || !now.isBefore(round.getEndsAt())) {
//             throw new IllegalArgumentException(
//                     "Round is not accepting bets");
//         }

//         if (user.getVirtualPoints() == null
//                 || user.getVirtualPoints() < amount) {
//             throw new IllegalArgumentException(
//                     "Insufficient virtual points");
//         }

//         user.setVirtualPoints(user.getVirtualPoints() - amount);

//         Bet bet = new Bet(
//                 user, round, "COLOR", selectedColor, null, amount);
//         betRepository.save(bet);

//         PointsTransaction transaction = new PointsTransaction(
//                 user,
//                 amount,
//                 "BET_DEBIT",
//                 UUID.randomUUID().toString(),
//                 "Virtual points deducted for color bet");

//         transactionRepository.save(transaction);

//         return bet;
//     }

//     @Transactional(readOnly = true)
//     public Map<String, Object> getColorSummary(String periodNumber) {

//         if (periodNumber == null || periodNumber.isBlank()) {
//             throw new IllegalArgumentException(
//                     "Period number is required");
//         }

//         GameRound round = gameRoundRepository
//                 .findByPeriodNumber(periodNumber)
//                 .orElseThrow(() ->
//                         new IllegalArgumentException("Round not found"));

//         Map<String, Object> summary = new LinkedHashMap<>();

//         for (String color : List.of("RED", "GREEN", "VIOLET")) {
//             Long total = betRepository.sumPendingAmountByRoundAndColor(
//                     round.getId(), color);
//             Long players = betRepository.countPendingPlayersByRoundAndColor(
//                     round.getId(), color);

//             Map<String, Object> data = new LinkedHashMap<>();
//             data.put("totalVirtualPoints",
//                     total == null ? 0L : total);
//             data.put("playerCount",
//                     players == null ? 0L : players);

//             summary.put(color, data);
//         }

//         summary.put("periodNumber", round.getPeriodNumber());
//         summary.put("status", round.getStatus());

//         return summary;
//     }

//     @Transactional
//     public void settleRound(Long roundId, String resultColor) {

//         String normalizedResultColor = normalizeColor(resultColor);

//         if (!isValidColor(normalizedResultColor)) {
//             throw new IllegalArgumentException(
//                     "Invalid result color");
//         }

//         GameRound round = gameRoundRepository
//                 .findByIdForUpdate(roundId)
//                 .orElseThrow(() ->
//                         new IllegalArgumentException("Round not found"));

//         if (!"RESULT_DECLARED".equals(round.getStatus())) {
//             throw new IllegalArgumentException(
//                     "Round result must be declared before settlement");
//         }

//         List<Bet> bets =
//                 betRepository.findByRoundIdForUpdate(roundId);

//         for (Bet bet : bets) {

//             if (!"PENDING".equals(bet.getStatus())) {
//                 continue;
//             }

//             String betColor = normalizeColor(bet.getSelectedColor());

//             if (normalizedResultColor.equals(betColor)) {

//                 long payout;

//                 try {
//                     payout = Math.multiplyExact(
//                             bet.getAmount(), PAYOUT_MULTIPLIER);
//                 } catch (ArithmeticException ex) {
//                     throw new IllegalArgumentException(
//                             "Payout amount is too large");
//                 }

//                 User user = userRepository.findByIdForUpdate(
//                                 bet.getUser().getId())
//                         .orElseThrow(() ->
//                                 new IllegalArgumentException(
//                                         "User not found"));

//                 long newBalance;

//                 try {
//                     newBalance = Math.addExact(
//                             user.getVirtualPoints(), payout);
//                 } catch (ArithmeticException ex) {
//                     throw new IllegalArgumentException(
//                             "Balance limit exceeded");
//                 }

//                 user.setVirtualPoints(newBalance);
//                 bet.markWon(payout);

//                 PointsTransaction transaction =
//                         new PointsTransaction(
//                                 user,
//                                 payout,
//                                 "BET_PAYOUT",
//                                 UUID.randomUUID().toString(),
//                                 "Virtual points payout for winning color");

//                 transactionRepository.save(transaction);

//             } else {
//                 bet.markLost();
//             }

//             betRepository.save(bet);
//         }
//     }

//     private String normalizeColor(String color) {
//         return color == null
//                 ? ""
//                 : color.trim().toUpperCase(Locale.ROOT);
//     }

//     private boolean isValidColor(String color) {
//         return List.of("RED", "GREEN", "VIOLET").contains(color);
//     }
// }




package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class BetService {

    private static final long MIN_BET = 10L;
    private static final long MAX_BET = 10000L;
    private static final BigDecimal DEFAULT_COMMISSION =
            new BigDecimal("5.00");

    private static final List<String> COLORS =
            List.of("RED", "GREEN", "BLUE");

    private final BetRepository betRepository;
    private final GameRoundRepository gameRoundRepository;
    private final GameControlRepository gameControlRepository;
    private final PointsTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final PlatformWalletRepository platformWalletRepository;
    private final PlatformWalletTransactionRepository
            platformWalletTransactionRepository;

    public BetService(
            BetRepository betRepository,
            GameRoundRepository gameRoundRepository,
            GameControlRepository gameControlRepository,
            PointsTransactionRepository transactionRepository,
            UserRepository userRepository,
            PlatformWalletRepository platformWalletRepository,
            PlatformWalletTransactionRepository
                    platformWalletTransactionRepository) {

        this.betRepository = betRepository;
        this.gameRoundRepository = gameRoundRepository;
        this.gameControlRepository = gameControlRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.platformWalletRepository = platformWalletRepository;
        this.platformWalletTransactionRepository =
                platformWalletTransactionRepository;
    }

    // ================= PLACE BET =================

    @Transactional
    public Bet placeColorBet(
            Long userId,
            String periodNumber,
            String color,
            Long amount) {

        if (userId == null || periodNumber == null
                || periodNumber.isBlank()) {
            throw new IllegalArgumentException(
                    "User and period are required");
        }

        if (amount == null
                || amount < MIN_BET
                || amount > MAX_BET) {
            throw new IllegalArgumentException(
                    "Bet must be between 10 and 10000 tokens");
        }

        String selectedColor = normalizeColor(color);

        if (!COLORS.contains(selectedColor)) {
            throw new IllegalArgumentException(
                    "Invalid color selection");
        }

        GameControl control = gameControlRepository
                .findByIdForUpdate((short) 1)
                .orElseThrow(() -> new IllegalStateException(
                        "Game control not initialized"));

        if (!"RUNNING".equals(control.getState())) {
            throw new IllegalArgumentException(
                    "Game is not accepting bets");
        }

        GameRound round = gameRoundRepository
                .findByPeriodNumber(periodNumber)
                .map(found -> gameRoundRepository
                        .findByIdForUpdate(found.getId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Round not found")))
                .orElseThrow(() ->
                        new IllegalArgumentException("Round not found"));

        OffsetDateTime now = OffsetDateTime.now();

        if (!"OPEN".equals(round.getStatus())
                || now.isBefore(round.getStartsAt())
                || !now.isBefore(
                        round.getEndsAt().minusSeconds(5))) {
            throw new IllegalArgumentException(
                    "Betting is closed for this round");
        }

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        if (!user.isActive()) {
            throw new IllegalArgumentException(
                    "User account is inactive");
        }

        if (user.getVirtualPoints() == null
                || user.getVirtualPoints() < amount) {
            throw new IllegalArgumentException(
                    "Insufficient virtual points");
        }

        user.setVirtualPoints(
                user.getVirtualPoints() - amount);

        Bet bet = new Bet(
                user,
                round,
                "COLOR",
                selectedColor,
                null,
                amount
        );

        betRepository.saveAndFlush(bet);

        transactionRepository.save(
                new PointsTransaction(
                        user,
                        amount,
                        "BET_DEBIT",
                        "BET_DEBIT_" + bet.getId(),
                        "Virtual points deducted for bet"
                )
        );

        return bet;
    }

    // ================= COLOR SUMMARY =================

    @Transactional(readOnly = true)
    public Map<String, Object> getColorSummary(
            String periodNumber) {

        if (periodNumber == null || periodNumber.isBlank()) {
            throw new IllegalArgumentException(
                    "Period number is required");
        }

        GameRound round = gameRoundRepository
                .findByPeriodNumber(periodNumber)
                .orElseThrow(() ->
                        new IllegalArgumentException("Round not found"));

        Map<String, Object> summary = new LinkedHashMap<>();

        for (String color : COLORS) {

            Long total =
                    betRepository.sumPendingAmountByRoundAndColor(
                            round.getId(), color);

            Long players =
                    betRepository.countPendingPlayersByRoundAndColor(
                            round.getId(), color);

            Map<String, Object> data = new LinkedHashMap<>();

            data.put("totalVirtualPoints",
                    total == null ? 0L : total);

            data.put("playerCount",
                    players == null ? 0L : players);

            summary.put(color, data);
        }

        summary.put("periodNumber", round.getPeriodNumber());
        summary.put("status", round.getStatus());

        return summary;
    }

    // ================= ROUND SETTLEMENT =================

    @Transactional
    public void settleRound(Long roundId, String resultColor) {

        String winningColor = normalizeColor(resultColor);

        if (!COLORS.contains(winningColor)) {
            throw new IllegalArgumentException(
                    "Invalid result color");
        }

        GameRound round = gameRoundRepository
                .findByIdForUpdate(roundId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Round not found"));

        if ("SETTLED".equals(round.getStatus())
                || "CANCELLED".equals(round.getStatus())) {
            return;
        }

        if (!"RESULT_DECLARED".equals(round.getStatus())) {
            throw new IllegalArgumentException(
                    "Round result is not declared");
        }

        List<Bet> allBets =
                betRepository.findByRoundIdForUpdate(roundId);

        List<Bet> pendingBets = allBets.stream()
                .filter(b -> "PENDING".equals(b.getStatus()))
                .toList();

        // CASE A: No bets
        if (pendingBets.isEmpty()) {
            round.settle(0L, 0L, 0L);
            return;
        }

        long totalPool = 0L;

        for (Bet bet : pendingBets) {
            totalPool = Math.addExact(totalPool, bet.getAmount());
        }

        // Lock all participating users in sorted order.
        Map<Long, User> lockedUsers = lockUsers(pendingBets);

        Set<Long> uniquePlayers = new HashSet<>();

        for (Bet bet : pendingBets) {
            uniquePlayers.add(bet.getUser().getId());
        }

        // CASE B: Exactly one unique player
        if (uniquePlayers.size() == 1) {

            settleSinglePlayer(
                    round,
                    pendingBets,
                    lockedUsers,
                    totalPool
            );

            return;
        }

        List<Bet> winningBets = pendingBets.stream()
                .filter(b ->
                        winningColor.equals(
                                normalizeColor(b.getSelectedColor())))
                .toList();

        // CASE D: Multiple players, no winning bets
        if (winningBets.isEmpty()) {

            creditPlatformWallet(
                    totalPool,
                    "NO_WINNER_POOL",
                    roundId,
                    "ROUND_" + roundId + "_NO_WINNER_POOL",
                    "Entire round pool: no winning bets"
            );

            for (Bet bet : pendingBets) {
                bet.markLost();
            }

            round.settle(totalPool, 0L, 0L);
            return;
        }

        // CASE C: Multiple players with winning bets
        settleMultiplePlayers(
                round,
                pendingBets,
                winningBets,
                lockedUsers,
                totalPool
        );
    }

    // ================= SINGLE PLAYER =================

    private void settleSinglePlayer(
            GameRound round,
            List<Bet> bets,
            Map<Long, User> lockedUsers,
            long totalPool) {

        long reward = totalPool / 4L;
        long totalPayout = Math.addExact(totalPool, reward);

        PlatformWallet wallet = platformWalletRepository
                .findByIdForUpdate((short) 1)
                .orElseThrow(() -> new IllegalStateException(
                        "Platform wallet not found"));

        // If wallet cannot fund reward, refund original stakes.
        if (wallet.getBalance() < reward) {

            User user = lockedUsers.values()
                    .iterator().next();

            for (Bet bet : bets) {

                long newBalance = Math.addExact(
                        user.getVirtualPoints(),
                        bet.getAmount());

                user.setVirtualPoints(newBalance);

                bet.markRefunded();

                transactionRepository.save(
                        new PointsTransaction(
                                user,
                                bet.getAmount(),
                                "BET_REFUND",
                                "BET_REFUND_" + bet.getId(),
                                "Original bet refunded"
                        )
                );
            }

            round.settle(totalPool, 0L, 0L);
            round.cancel();
            return;
        }

        if (reward > 0) {

            wallet.debit(reward);

            platformWalletTransactionRepository.save(
                    new PlatformWalletTransaction(
                            reward,
                            "SINGLE_PLAYER_REWARD",
                            round.getId(),
                            "ROUND_" + round.getId()
                                    + "_SINGLE_PLAYER_REWARD",
                            "25 percent single-player reward"
                    )
            );
        }

        User user = lockedUsers.values()
                .iterator().next();

        Map<Long, Long> payouts =
                distributeProportionally(bets, totalPayout, totalPool);

        for (Bet bet : bets) {

            long payout = payouts.get(bet.getId());

            user.setVirtualPoints(
                    Math.addExact(
                            user.getVirtualPoints(),
                            payout));

            bet.markWon(payout);

            transactionRepository.save(
                    new PointsTransaction(
                            user,
                            payout,
                            "BET_PAYOUT",
                            "BET_PAYOUT_" + bet.getId(),
                            "Single-player round payout"
                    )
            );
        }

        round.settle(totalPool, 0L, totalPayout);
    }

    // ================= MULTIPLE PLAYERS =================

    private void settleMultiplePlayers(
            GameRound round,
            List<Bet> allBets,
            List<Bet> winningBets,
            Map<Long, User> lockedUsers,
            long totalPool) {

        BigDecimal commissionPercent =
                round.getCommissionPercent() == null
                        ? DEFAULT_COMMISSION
                        : round.getCommissionPercent();

        long commission = BigDecimal.valueOf(totalPool)
                .multiply(commissionPercent)
                .divide(
                        new BigDecimal("100"),
                        0,
                        RoundingMode.DOWN
                )
                .longValueExact();

        long prizePool = totalPool - commission;

        long totalWinningStake = 0L;

        for (Bet bet : winningBets) {
            totalWinningStake = Math.addExact(
                    totalWinningStake,
                    bet.getAmount());
        }

        long totalPayout = 0L;

        Map<Long, Long> userPayouts = new HashMap<>();

        for (Bet bet : allBets) {

            if (!winningBets.contains(bet)) {
                bet.markLost();
                continue;
            }

            long payout = BigInteger.valueOf(prizePool)
                    .multiply(BigInteger.valueOf(bet.getAmount()))
                    .divide(BigInteger.valueOf(totalWinningStake))
                    .longValueExact();

            totalPayout = Math.addExact(totalPayout, payout);

            User user = lockedUsers.get(bet.getUser().getId());

            userPayouts.merge(
                    user.getId(),
                    payout,
                    Math::addExact
            );

            bet.markWon(payout);

            transactionRepository.save(
                    new PointsTransaction(
                            user,
                            payout,
                            "BET_PAYOUT",
                            "BET_PAYOUT_" + bet.getId(),
                            "Winning color proportional payout"
                    )
            );
        }

        for (Map.Entry<Long, Long> entry :
                userPayouts.entrySet()) {

            User user = lockedUsers.get(entry.getKey());

            user.setVirtualPoints(
                    Math.addExact(
                            user.getVirtualPoints(),
                            entry.getValue()));
        }

        // Commission plus rounding remainder stays with platform.
        long platformProfit = totalPool - totalPayout;

        if (platformProfit > 0) {

            creditPlatformWallet(
                    platformProfit,
                    "ROUND_PROFIT",
                    round.getId(),
                    "ROUND_" + round.getId() + "_PROFIT",
                    "Round commission and payout remainder"
            );
        }

        round.settle(
                totalPool,
                commission,
                totalPayout
        );
    }

    // ================= USER LOCKING =================

    private Map<Long, User> lockUsers(List<Bet> bets) {

        Set<Long> userIds = new TreeSet<>();

        for (Bet bet : bets) {
            userIds.add(bet.getUser().getId());
        }

        Map<Long, User> users = new LinkedHashMap<>();

        for (Long userId : userIds) {

            User user = userRepository.findByIdForUpdate(userId)
                    .orElseThrow(() ->
                            new IllegalStateException("User not found"));

            users.put(userId, user);
        }

        return users;
    }

    // ================= PROPORTIONAL DISTRIBUTION =================

    private Map<Long, Long> distributeProportionally(
            List<Bet> bets,
            long totalPayout,
            long totalStake) {

        Map<Long, Long> payouts = new LinkedHashMap<>();

        long distributed = 0L;

        for (Bet bet : bets) {

            long payout = BigInteger.valueOf(totalPayout)
                    .multiply(BigInteger.valueOf(bet.getAmount()))
                    .divide(BigInteger.valueOf(totalStake))
                    .longValueExact();

            payouts.put(bet.getId(), payout);
            distributed = Math.addExact(distributed, payout);
        }

        long remainder = totalPayout - distributed;

        for (Bet bet : bets) {

            if (remainder == 0) {
                break;
            }

            payouts.put(
                    bet.getId(),
                    Math.addExact(payouts.get(bet.getId()), 1L)
            );

            remainder--;
        }

        return payouts;
    }

    // ================= PLATFORM WALLET =================

    private void creditPlatformWallet(
            long amount,
            String transactionType,
            Long roundId,
            String idempotencyKey,
            String description) {

        if (amount <= 0) {
            return;
        }

        if (platformWalletTransactionRepository
                .findByIdempotencyKey(idempotencyKey)
                .isPresent()) {
            return;
        }

        PlatformWallet wallet = platformWalletRepository
                .findByIdForUpdate((short) 1)
                .orElseThrow(() -> new IllegalStateException(
                        "Platform wallet not found"));

        wallet.credit(amount);

        platformWalletTransactionRepository.save(
                new PlatformWalletTransaction(
                        amount,
                        transactionType,
                        roundId,
                        idempotencyKey,
                        description
                )
        );
    }

    // ================= HELPERS =================

    private String normalizeColor(String color) {
        return color == null
                ? ""
                : color.trim().toUpperCase(Locale.ROOT);
    }
}