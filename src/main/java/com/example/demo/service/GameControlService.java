package com.example.demo.service;

import com.example.demo.entity.GameControl;
import com.example.demo.entity.GameRound;
import com.example.demo.repository.GameControlRepository;
import com.example.demo.repository.GameRoundRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;

@Service
public class GameControlService {

    private final GameControlRepository gameControlRepository;
    private final GameRoundRepository gameRoundRepository;

    public GameControlService(
            GameControlRepository gameControlRepository,
            GameRoundRepository gameRoundRepository) {
        this.gameControlRepository = gameControlRepository;
        this.gameRoundRepository = gameRoundRepository;
    }

    @Transactional(readOnly = true)
    public GameControl getCurrentState() {
        return gameControlRepository.findById((short) 1)
                .orElseThrow(() -> new IllegalStateException(
                        "Game control state not initialized"));
    }

    // Scheduler locks the control row before processing rounds.
    @Transactional
    public GameControl getForScheduler() {
        return getForUpdate();
    }

    @Transactional
    public GameControl startGame() {
        GameControl control = getForUpdate();

        if ("STOPPING".equals(control.getState())) {
            throw new IllegalStateException(
                    "The current round is still finishing");
        }

        if ("PAUSED".equals(control.getState())) {
            throw new IllegalStateException(
                    "Use Resume to continue the paused game");
        }

        if ("STOPPED".equals(control.getState())) {
            control.start();
            return gameControlRepository.save(control);
        }

        return control;
    }

    @Transactional
    public GameControl pauseGame() {
        GameControl control = getForUpdate();

        if (!"RUNNING".equals(control.getState())) {
            throw new IllegalStateException(
                    "Only a running game can be paused");
        }

        GameRound round = gameRoundRepository
                .findFirstByStatusOrderByStartsAtDesc("OPEN")
                .orElseThrow(() -> new IllegalStateException(
                        "No open round is available to pause"));

        long remaining = Math.max(
                0,
                Duration.between(
                        OffsetDateTime.now(),
                        round.getEndsAt()).getSeconds());

        control.pause(remaining);
        return gameControlRepository.save(control);
    }

    @Transactional
    public GameControl resumeGame() {
        GameControl control = getForUpdate();

        if (!"PAUSED".equals(control.getState())) {
            throw new IllegalStateException(
                    "Only a paused game can be resumed");
        }

        GameRound round = gameRoundRepository
                .findFirstByStatusOrderByStartsAtDesc("OPEN")
                .orElseThrow(() -> new IllegalStateException(
                        "No open round is available to resume"));

        long remaining = control.getPausedRemainingSeconds() == null
                ? 0
                : control.getPausedRemainingSeconds();

        round.setEndsAt(OffsetDateTime.now().plusSeconds(remaining));
        gameRoundRepository.save(round);

        control.resume();
        return gameControlRepository.save(control);
    }

    @Transactional
    public GameControl stopGame() {
        GameControl control = getForUpdate();

        if ("STOPPED".equals(control.getState())
                || "STOPPING".equals(control.getState())) {
            return control;
        }

        if ("PAUSED".equals(control.getState())) {
            GameRound round = gameRoundRepository
                    .findFirstByStatusOrderByStartsAtDesc("OPEN")
                    .orElseThrow(() -> new IllegalStateException(
                            "No open round is available to finish"));

            long remaining = control.getPausedRemainingSeconds() == null
                    ? 0
                    : control.getPausedRemainingSeconds();

            round.setEndsAt(
                    OffsetDateTime.now().plusSeconds(remaining));
            gameRoundRepository.save(round);
        }

        control.beginStopping();
        return gameControlRepository.save(control);
    }

    @Transactional
    public void finishStoppingIfNoOpenRound() {
        GameControl control = getForUpdate();

        if (!"STOPPING".equals(control.getState())) {
            return;
        }

        if (gameRoundRepository.countByStatus("OPEN") == 0) {
            control.stop();
            gameControlRepository.save(control);
        }
    }

    private GameControl getForUpdate() {
        return gameControlRepository.findByIdForUpdate((short) 1)
                .orElseThrow(() -> new IllegalStateException(
                        "Game control state not initialized"));
    }
}