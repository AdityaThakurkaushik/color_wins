package com.example.demo.service;

import com.example.demo.entity.LeaderboardPlayer;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LeaderboardServiceTest {

    @Test
    void emptyPoolReturnsEmpty() {
        assertEquals(List.of(), LeaderboardService.selectTen(List.of(), 0));
    }

    @Test
    void thirtyPlayersRotateInTens() {
        List<LeaderboardPlayer> pool = pool(30);
        assertEquals(List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), slots(LeaderboardService.selectTen(pool, 0)));
        assertEquals(List.of(11, 12, 13, 14, 15, 16, 17, 18, 19, 20), slots(LeaderboardService.selectTen(pool, 1)));
        assertEquals(List.of(21, 22, 23, 24, 25, 26, 27, 28, 29, 30), slots(LeaderboardService.selectTen(pool, 2)));
        assertEquals(List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), slots(LeaderboardService.selectTen(pool, 3)));
    }

    private List<LeaderboardPlayer> pool(int size) {
        List<LeaderboardPlayer> players = new ArrayList<>();
        for (int i = 1; i <= size; i++) {
            players.add(new LeaderboardPlayer(i, "P" + i, "img"));
        }
        return players;
    }

    private List<Integer> slots(List<LeaderboardPlayer> players) {
        return players.stream().map(LeaderboardPlayer::getSlotNo).toList();
    }
}
