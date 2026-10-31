
package com.example.demo;

import com.example.demo.entity.GameControl;
import com.example.demo.entity.GameRound;
import com.example.demo.repository.GameRoundRepository;
import com.example.demo.service.GameControlService;
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
    private final GameControlService gameControlService;

    public GameRoundScheduler(
            GameRoundRepository gameRoundRepository,
            GameRoundService gameRoundService,
            GameControlService gameControlService) {

        this.gameRoundRepository = gameRoundRepository;
        this.gameRoundService = gameRoundService;
        this.gameControlService = gameControlService;
    }

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void processRounds() {

        // Lock game control before processing rounds.
        GameControl control = gameControlService.getForScheduler();
        String state = control.getState();

        // Do not process rounds while paused or stopped.
        if (!"RUNNING".equals(state)
                && !"STOPPING".equals(state)) {
            return;
        }

        // Settle expired rounds.
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

        long openRounds =
                gameRoundRepository.countByStatus("OPEN");

        // Complete stopping after the current round finishes.
        if ("STOPPING".equals(state)) {

            if (openRounds == 0) {
                gameControlService.finishStoppingIfNoOpenRound();
            }

            return;
        }

        // Create new rounds only when the game is RUNNING.
        if ("RUNNING".equals(state) && openRounds == 0) {
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
