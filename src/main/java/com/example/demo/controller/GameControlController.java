package com.example.demo.controller;

import com.example.demo.entity.GameControl;
import com.example.demo.service.GameControlService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/game-control")
public class GameControlController {

    private final GameControlService gameControlService;

    public GameControlController(GameControlService gameControlService) {
        this.gameControlService = gameControlService;
    }

    @GetMapping
    public ResponseEntity<?> getState() {
        return ResponseEntity.ok(toResponse(
                gameControlService.getCurrentState()));
    }

    @PostMapping("/start")
    public ResponseEntity<?> start() {
        return execute(() -> gameControlService.startGame());
    }

    @PostMapping("/pause")
    public ResponseEntity<?> pause() {
        return execute(() -> gameControlService.pauseGame());
    }

    @PostMapping("/resume")
    public ResponseEntity<?> resume() {
        return execute(() -> gameControlService.resumeGame());
    }

    @PostMapping("/stop")
    public ResponseEntity<?> stop() {
        return execute(() -> gameControlService.stopGame());
    }

    private ResponseEntity<?> execute(
            java.util.function.Supplier<GameControl> action) {
        try {
            return ResponseEntity.ok(toResponse(action.get()));
        } catch (IllegalStateException | IllegalArgumentException ex) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    private Map<String, Object> toResponse(GameControl control) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("state", control.getState());
        response.put("pausedRemainingSeconds",
                control.getPausedRemainingSeconds());
        response.put("updatedAt", control.getUpdatedAt());
        return response;
    }
}