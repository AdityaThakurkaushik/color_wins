package com.example.demo.controller;

import com.example.demo.service.LeaderboardService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/leaderboard")
public class AdminLeaderboardController {

    private final LeaderboardService leaderboardService;

    public AdminLeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    public record RotationRequest(Integer rotationHours) {}

    public record PlayerRequest(String displayName, String profileImage, Long totalBet) {}

    @GetMapping
    public Map<String, Object> board() {
        return leaderboardService.adminBoard();
    }

    @PutMapping("/rotation")
    public Map<String, Object> rotation(@RequestBody RotationRequest request) {
        int hours = request == null || request.rotationHours() == null ? 0 : request.rotationHours();
        return leaderboardService.updateRotationHours(hours);
    }

    @PutMapping("/slots/{slotNo}")
    public Map<String, Object> upsert(
            @PathVariable int slotNo,
            @RequestBody PlayerRequest request) {
        String name = request == null ? null : request.displayName();
        String image = request == null ? null : request.profileImage();
        return leaderboardService.upsertPlayer(slotNo, name, image, request == null ? null : request.totalBet());
    }

    @DeleteMapping("/slots/{slotNo}")
    public Map<String, Object> clear(@PathVariable int slotNo) {
        return leaderboardService.clearPlayer(slotNo);
    }
}
