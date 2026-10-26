
package com.example.demo;

import com.example.demo.entity.GameRound;
import com.example.demo.repository.GameRoundRepository;
import com.example.demo.service.GameRoundService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Component
public class GameRoundScheduler {

    private final GameRoundRepository gameRoundRepository;
    private final GameRoundService gameRoundService;

    public GameRoundScheduler(
            GameRoundRepository gameRoundRepository,
            GameRoundService gameRoundService) {
        this.gameRoundRepository = gameRoundRepository;
        this.gameRoundService = gameRoundService;
    }

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void processRounds() {
        List<GameRound> expiredRounds =
                gameRoundRepository.findByStatusAndEndsAtLessThanEqual(
                        "OPEN", OffsetDateTime.now());

        for (GameRound round : expiredRounds) {
            try {
                gameRoundService.closeRoundAndDeclareResult(round.getId());
            } catch (IllegalArgumentException ex) {
                System.err.println(
                        "Could not process round "
                                + round.getPeriodNumber()
                                + ": " + ex.getMessage());
            }
        }

        long openRounds = gameRoundRepository.countByStatus("OPEN");

        if (openRounds == 0) {
            try {
                gameRoundService.createRound();
            } catch (Exception ex) {
                System.err.println(
                        "Could not create a new game round: "
                                + ex.getMessage());
            }
        }
    }
}
