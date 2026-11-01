package com.example.demo.service;

import com.example.demo.entity.GameRound;
import com.example.demo.repository.GameRoundRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
public class GameRoundService {

    private static final long ROUND_DURATION_SECONDS = 60;

    private static final Map<String, List<Short>> NUMBERS_BY_COLOR = Map.of(
            "RED", List.of((short) 0, (short) 3, (short) 6, (short) 9),
            "GREEN", List.of((short) 1, (short) 4, (short) 7),
            "BLUE", List.of((short) 2, (short) 5, (short) 8)
    );

    private static final List<String> COLORS = List.copyOf(NUMBERS_BY_COLOR.keySet());

    private static final SecureRandom RANDOM = new SecureRandom();

    private final GameRoundRepository gameRoundRepository;
    private final BetService betService;
    private final CommissionSettingService commissionSettingService;

    public GameRoundService(
            GameRoundRepository gameRoundRepository,
            BetService betService,
            CommissionSettingService commissionSettingService) {

        this.gameRoundRepository = gameRoundRepository;
        this.betService = betService;
        this.commissionSettingService = commissionSettingService;
    }

    @Transactional
    public GameRound createRound() {

        OffsetDateTime now = OffsetDateTime.now()
                .truncatedTo(ChronoUnit.SECONDS);

        OffsetDateTime endsAt = now.plusSeconds(
                ROUND_DURATION_SECONDS
        );

        String periodNumber = "CW-" + now.toInstant().toEpochMilli();

        GameRound round = new GameRound(
                periodNumber,
                now,
                endsAt
        );

        round.setCommissionPercent(
                commissionSettingService.getCurrentCommission()
        );

        return gameRoundRepository.save(round);
    }

    @Transactional
    public GameRound closeRoundAndDeclareResult(Long roundId) {

        GameRound round = gameRoundRepository
                .findByIdForUpdate(roundId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Round not found")
                );

        if (!"OPEN".equals(round.getStatus())) {
            throw new IllegalArgumentException(
                    "Round is not open"
            );
        }

        OffsetDateTime now = OffsetDateTime.now();

        if (now.isBefore(round.getEndsAt())) {
            throw new IllegalArgumentException(
                    "Round has not ended yet"
            );
        }

        String resultColor = COLORS.get(RANDOM.nextInt(COLORS.size()));
        List<Short> numbers = NUMBERS_BY_COLOR.get(resultColor);
        short resultNumber = numbers.get(RANDOM.nextInt(numbers.size()));

        round.close();

        round.declareResult(
                resultNumber,
                resultColor
        );

        gameRoundRepository.save(round);

        betService.settleRound(
                round.getId(),
                resultColor
        );

        return round;
    }
}
