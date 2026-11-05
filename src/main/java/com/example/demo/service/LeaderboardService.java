package com.example.demo.service;

import com.example.demo.entity.LeaderboardPlayer;
import com.example.demo.entity.LeaderboardSettings;
import com.example.demo.repository.LeaderboardPlayerRepository;
import com.example.demo.repository.LeaderboardSettingsRepository;
import com.example.demo.util.DisplayNames;
import com.example.demo.util.ImageDataUrls;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LeaderboardService {

    public static final int MAX_PLAYERS = 30;
    public static final int VISIBLE_COUNT = 10;
    private static final short SETTINGS_ID = 1;

    private final LeaderboardSettingsRepository settingsRepository;
    private final LeaderboardPlayerRepository playerRepository;

    public LeaderboardService(
            LeaderboardSettingsRepository settingsRepository,
            LeaderboardPlayerRepository playerRepository) {
        this.settingsRepository = settingsRepository;
        this.playerRepository = playerRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicBoard() {
        LeaderboardSettings settings = requiredSettings();
        List<LeaderboardPlayer> pool = playerRepository.findAllByOrderBySlotNoAsc();
        long window = currentWindow(settings.getRotationHours());
        List<LeaderboardPlayer> visible = new ArrayList<>(selectTen(pool, window));
        visible.sort((a, b) -> Long.compare(b.getTotalBet(), a.getTotalBet()));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("rotationHours", settings.getRotationHours());
        body.put("nextChangeAt", nextChangeAt(settings.getRotationHours(), window).toString());
        body.put("poolSize", pool.size());
        body.put("players", toPublicPlayers(visible));
        return body;
    }

    @Transactional
    public Map<String, Object> adminBoard() {
        Map<String, Object> body = publicBoard();
        List<Map<String, Object>> slots = new ArrayList<>();
        List<LeaderboardPlayer> pool = playerRepository.findAllByOrderBySlotNoAsc();
        Map<Integer, LeaderboardPlayer> bySlot = new LinkedHashMap<>();
        for (LeaderboardPlayer player : pool) {
            bySlot.put(player.getSlotNo(), player);
        }
        for (int slot = 1; slot <= MAX_PLAYERS; slot++) {
            LeaderboardPlayer player = bySlot.get(slot);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("slotNo", slot);
            if (player == null) {
                row.put("filled", false);
                row.put("displayName", "");
                row.put("profileImage", "");
                row.put("totalBet", 0);
            } else {
                row.put("filled", true);
                row.put("displayName", player.getDisplayName());
                row.put("profileImage", player.getProfileImage());
                row.put("totalBet", player.getTotalBet());
            }
            slots.add(row);
        }
        body.put("slots", slots);
        return body;
    }

    @Transactional
    public Map<String, Object> updateRotationHours(int hours) {
        if (hours != 24 && hours != 48) {
            throw new IllegalArgumentException("Rotation must be 24 or 48 hours");
        }
        LeaderboardSettings settings = settingsRepository.findByIdForUpdate(SETTINGS_ID)
                .orElseThrow(() -> new IllegalStateException("Leaderboard settings not initialized"));
        settings.setRotationHours(hours);
        return adminBoard();
    }

    @Transactional
    public Map<String, Object> upsertPlayer(int slotNo, String displayName, String profileImage, Long totalBet) {
        if (slotNo < 1 || slotNo > MAX_PLAYERS) {
            throw new IllegalArgumentException("Slot must be between 1 and 30");
        }
        String name = DisplayNames.normalize(displayName);
        String image = ImageDataUrls.normalize(profileImage);
        if (image == null) {
            throw new IllegalArgumentException("Upload a JPEG, PNG or WebP photo");
        }
        long bets = totalBet == null ? 0L : totalBet;
        if (bets < 0 || bets > 10_000_000L) {
            throw new IllegalArgumentException("Total bet must be between 0 and 10000000");
        }
        LeaderboardPlayer player = playerRepository.findBySlotNo(slotNo)
                .orElseGet(() -> new LeaderboardPlayer(slotNo, name, image));
        player.setDisplayName(name);
        player.setProfileImage(image);
        player.setTotalBet(bets);
        playerRepository.save(player);
        return adminBoard();
    }

    @Transactional
    public Map<String, Object> clearPlayer(int slotNo) {
        playerRepository.findBySlotNo(slotNo).ifPresent(playerRepository::delete);
        return adminBoard();
    }

    static List<LeaderboardPlayer> selectTen(List<LeaderboardPlayer> pool, long window) {
        if (pool == null || pool.isEmpty()) {
            return List.of();
        }
        int size = pool.size();
        int show = Math.min(VISIBLE_COUNT, size);
        int start = (int) Math.floorMod(window * VISIBLE_COUNT, size);
        List<LeaderboardPlayer> visible = new ArrayList<>(show);
        for (int i = 0; i < show; i++) {
            visible.add(pool.get((start + i) % size));
        }
        return visible;
    }

    private LeaderboardSettings requiredSettings() {
        return settingsRepository.findById(SETTINGS_ID)
                .orElseThrow(() -> new IllegalStateException("Leaderboard settings not initialized"));
    }

    private long currentWindow(int rotationHours) {
        long period = rotationHours * 3600L;
        return Instant.now().getEpochSecond() / period;
    }

    private OffsetDateTime nextChangeAt(int rotationHours, long window) {
        long period = rotationHours * 3600L;
        return OffsetDateTime.ofInstant(Instant.ofEpochSecond((window + 1) * period), ZoneOffset.UTC);
    }

    private List<Map<String, Object>> toPublicPlayers(List<LeaderboardPlayer> visible) {
        List<Map<String, Object>> players = new ArrayList<>();
        int rank = 1;
        for (LeaderboardPlayer player : visible) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("rank", rank++);
            row.put("name", player.getDisplayName());
            row.put("image", player.getProfileImage());
            row.put("totalBet", player.getTotalBet());
            players.add(row);
        }
        return players;
    }
}
