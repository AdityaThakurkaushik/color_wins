package com.example.demo.service;

import com.example.demo.entity.Bet;
import com.example.demo.entity.GameControl;
import com.example.demo.entity.GameRound;
import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.User;
import com.example.demo.repository.BetRepository;
import com.example.demo.repository.GameControlRepository;
import com.example.demo.repository.GameRoundRepository;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class BetService {

    private static final long PAYOUT_MULTIPLIER = 2L;

    private final BetRepository betRepository;
    private final GameRoundRepository gameRoundRepository;
    private final GameControlRepository gameControlRepository;
    private final PointsTransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public BetService(
            BetRepository betRepository,
            GameRoundRepository gameRoundRepository,
            GameControlRepository gameControlRepository,
            PointsTransactionRepository transactionRepository,
            UserRepository userRepository) {
        this.betRepository = betRepository;
        this.gameRoundRepository = gameRoundRepository;
        this.gameControlRepository = gameControlRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Bet placeColorBet(
            Long userId, String periodNumber, String color, Long amount) {

        if (userId == null || periodNumber == null
                || periodNumber.isBlank()) {
            throw new IllegalArgumentException(
                    "User and period are required");
        }

        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException(
                    "Bet amount must be positive");
        }

        String selectedColor = normalizeColor(color);

        if (!isValidColor(selectedColor)) {
            throw new IllegalArgumentException(
                    "Invalid color selection");
        }

        // Lock game control first. This serializes bet placement
        // with Pause, Stop and scheduler state changes.
        GameControl control = gameControlRepository
                .findByIdForUpdate((short) 1)
                .orElseThrow(() -> new IllegalStateException(
                        "Game control state not initialized"));

        if (!"RUNNING".equals(control.getState())) {
            throw new IllegalArgumentException(
                    "Game is not accepting bets");
        }

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        if (!user.isActive()) {
            throw new IllegalArgumentException(
                    "User account is inactive");
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
                || !now.isBefore(round.getEndsAt())) {
            throw new IllegalArgumentException(
                    "Round is not accepting bets");
        }

        if (user.getVirtualPoints() == null
                || user.getVirtualPoints() < amount) {
            throw new IllegalArgumentException(
                    "Insufficient virtual points");
        }

        user.setVirtualPoints(user.getVirtualPoints() - amount);

        Bet bet = new Bet(
                user, round, "COLOR", selectedColor, null, amount);
        betRepository.save(bet);

        PointsTransaction transaction = new PointsTransaction(
                user,
                amount,
                "BET_DEBIT",
                UUID.randomUUID().toString(),
                "Virtual points deducted for color bet");

        transactionRepository.save(transaction);

        return bet;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getColorSummary(String periodNumber) {

        if (periodNumber == null || periodNumber.isBlank()) {
            throw new IllegalArgumentException(
                    "Period number is required");
        }

        GameRound round = gameRoundRepository
                .findByPeriodNumber(periodNumber)
                .orElseThrow(() ->
                        new IllegalArgumentException("Round not found"));

        Map<String, Object> summary = new LinkedHashMap<>();

        for (String color : List.of("RED", "GREEN", "VIOLET")) {
            Long total = betRepository.sumPendingAmountByRoundAndColor(
                    round.getId(), color);
            Long players = betRepository.countPendingPlayersByRoundAndColor(
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

    @Transactional
    public void settleRound(Long roundId, String resultColor) {

        String normalizedResultColor = normalizeColor(resultColor);

        if (!isValidColor(normalizedResultColor)) {
            throw new IllegalArgumentException(
                    "Invalid result color");
        }

        GameRound round = gameRoundRepository
                .findByIdForUpdate(roundId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Round not found"));

        if (!"RESULT_DECLARED".equals(round.getStatus())) {
            throw new IllegalArgumentException(
                    "Round result must be declared before settlement");
        }

        List<Bet> bets =
                betRepository.findByRoundIdForUpdate(roundId);

        for (Bet bet : bets) {

            if (!"PENDING".equals(bet.getStatus())) {
                continue;
            }

            String betColor = normalizeColor(bet.getSelectedColor());

            if (normalizedResultColor.equals(betColor)) {

                long payout;

                try {
                    payout = Math.multiplyExact(
                            bet.getAmount(), PAYOUT_MULTIPLIER);
                } catch (ArithmeticException ex) {
                    throw new IllegalArgumentException(
                            "Payout amount is too large");
                }

                User user = userRepository.findByIdForUpdate(
                                bet.getUser().getId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "User not found"));

                long newBalance;

                try {
                    newBalance = Math.addExact(
                            user.getVirtualPoints(), payout);
                } catch (ArithmeticException ex) {
                    throw new IllegalArgumentException(
                            "Balance limit exceeded");
                }

                user.setVirtualPoints(newBalance);
                bet.markWon(payout);

                PointsTransaction transaction =
                        new PointsTransaction(
                                user,
                                payout,
                                "BET_PAYOUT",
                                UUID.randomUUID().toString(),
                                "Virtual points payout for winning color");

                transactionRepository.save(transaction);

            } else {
                bet.markLost();
            }

            betRepository.save(bet);
        }
    }

    private String normalizeColor(String color) {
        return color == null
                ? ""
                : color.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isValidColor(String color) {
        return List.of("RED", "GREEN", "VIOLET").contains(color);
    }
}