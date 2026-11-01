
// package com.example.demo.service;

// import com.example.demo.entity.GameRound;
// import com.example.demo.repository.GameRoundRepository;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;

// import java.time.OffsetDateTime;
// import java.time.temporal.ChronoUnit;
// import java.util.concurrent.ThreadLocalRandom;

// @Service
// public class GameRoundService {

//     private static final long ROUND_DURATION_SECONDS = 60;

//     private final GameRoundRepository gameRoundRepository;
//     private final BetService betService;

//     public GameRoundService(
//             GameRoundRepository gameRoundRepository,
//             BetService betService) {
//         this.gameRoundRepository = gameRoundRepository;
//         this.betService = betService;
//     }

//     @Transactional
//     public GameRound createRound() {
//         OffsetDateTime now = OffsetDateTime.now()
//                 .truncatedTo(ChronoUnit.SECONDS);

//         OffsetDateTime endsAt = now.plusSeconds(ROUND_DURATION_SECONDS);
//         String periodNumber = "CW-" + now.toInstant().toEpochMilli();

//         GameRound round = new GameRound(periodNumber, now, endsAt);

//         return gameRoundRepository.save(round);
//     }

//     @Transactional
//     public GameRound closeRoundAndDeclareResult(Long roundId) {
//         GameRound round = gameRoundRepository.findByIdForUpdate(roundId)
//                 .orElseThrow(() ->
//                         new IllegalArgumentException("Round not found"));

//         if (!"OPEN".equals(round.getStatus())) {
//             throw new IllegalArgumentException("Round is not open");
//         }

//         OffsetDateTime now = OffsetDateTime.now();

//         if (now.isBefore(round.getEndsAt())) {
//             throw new IllegalArgumentException(
//                     "Round has not ended yet");
//         }

//         short resultNumber = (short) ThreadLocalRandom.current()
//                 .nextInt(0, 10);

//         String resultColor = getColorForNumber(resultNumber);

//         round.close();
//         round.declareResult(resultNumber, resultColor);
//         gameRoundRepository.save(round);

//         // Settle bets only after the result has been declared.
//         betService.settleRound(round.getId(), resultColor);

//         return round;
//     }

//     private String getColorForNumber(short number) {
//         if (number == 0 || number == 5) {
//             return "VIOLET";
//         }

//         return number % 2 == 0 ? "RED" : "GREEN";
//     }
// }
package com.example.demo.service;

import com.example.demo.entity.GameRound;
import com.example.demo.repository.GameRoundRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class GameRoundService {

    private static final long ROUND_DURATION_SECONDS = 60;

    private static final String[] COLORS = {
            "RED", "GREEN", "BLUE"
    };

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

        // Save commission percentage for this specific round.
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

        // Color is selected randomly and independently.
        String resultColor = COLORS[RANDOM.nextInt(COLORS.length)];

        // Keep result number for existing API compatibility.
        short resultNumber = (short) RANDOM.nextInt(0, 10);

        round.close();

        round.declareResult(
                resultNumber,
                resultColor
        );

        gameRoundRepository.save(round);

        // Settle bets after result declaration.
        betService.settleRound(
                round.getId(),
                resultColor
        );

        return round;
    }
}