package com.example.demo.service;

import com.example.demo.entity.SpinSettings;
import com.example.demo.repository.SpinSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class SpinSettingsService {

    public static final short SETTINGS_ID = 1;
    public static final int SEGMENT_COUNT = 10;
    public static final String DEFAULT_MULTIPLIERS = "0,0,0,0,0,1.2,1.4,1.6,1.8,2.0";

    private final SpinSettingsRepository spinSettingsRepository;

    public SpinSettingsService(SpinSettingsRepository spinSettingsRepository) {
        this.spinSettingsRepository = spinSettingsRepository;
    }

    @Transactional(readOnly = true)
    public SpinSettings requireSettings() {
        return spinSettingsRepository.findById(SETTINGS_ID)
                .orElseThrow(() -> new IllegalStateException("Spin settings not found"));
    }

    @Transactional(readOnly = true)
    public List<BigDecimal> activeMultipliers() {
        return parseAndValidateMultipliers(requireSettings().getMultipliers());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicConfig() {
        SpinSettings settings = requireSettings();
        List<BigDecimal> multipliers = parseAndValidateMultipliers(settings.getMultipliers());
        return toView(settings, multipliers);
    }

    @Transactional
    public Map<String, Object> updateSettings(
            Boolean enabled,
            Long minBet,
            Long maxBet,
            List<BigDecimal> multipliers,
            String adminUsername) {
        SpinSettings settings = spinSettingsRepository.findByIdForUpdate(SETTINGS_ID)
                .orElseThrow(() -> new IllegalStateException("Spin settings not found"));

        List<BigDecimal> nextMults = multipliers != null
                ? parseAndValidateMultipliers(multipliers)
                : parseAndValidateMultipliers(settings.getMultipliers());

        long nextMin = minBet != null ? minBet : settings.getMinBet();
        long nextMax = maxBet != null ? maxBet : settings.getMaxBet();
        validateBetBounds(nextMin, nextMax);

        if (enabled != null) {
            settings.setEnabled(enabled);
        }
        settings.setMinBet(nextMin);
        settings.setMaxBet(nextMax);
        settings.setMultipliers(serialize(nextMults));
        settings.setUpdatedBy(adminUsername == null ? "admin" : adminUsername.trim());

        spinSettingsRepository.save(settings);
        return toView(settings, nextMults);
    }

    public static List<BigDecimal> parseAndValidateMultipliers(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Multipliers are required");
        }
        String[] parts = raw.split(",");
        List<BigDecimal> list = new ArrayList<>();
        for (String part : parts) {
            list.add(new BigDecimal(part.trim()));
        }
        return parseAndValidateMultipliers(list);
    }

    public static List<BigDecimal> parseAndValidateMultipliers(List<BigDecimal> input) {
        if (input == null || input.size() != SEGMENT_COUNT) {
            throw new IllegalArgumentException("Exactly " + SEGMENT_COUNT + " multipliers are required");
        }
        List<BigDecimal> cleaned = new ArrayList<>(SEGMENT_COUNT);
        for (BigDecimal value : input) {
            if (value == null) {
                throw new IllegalArgumentException("Multiplier cannot be null");
            }
            BigDecimal mult = value.setScale(2, RoundingMode.HALF_UP);
            if (mult.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Multiplier cannot be negative");
            }
            if (mult.compareTo(new BigDecimal("20.00")) > 0) {
                throw new IllegalArgumentException("Multiplier cannot exceed 20x");
            }
            // Must pay integer tokens for bets that are multiples of 5
            BigDecimal probe = BigDecimal.valueOf(5L).multiply(mult);
            if (probe.stripTrailingZeros().scale() > 0) {
                throw new IllegalArgumentException(
                        "Multiplier " + mult.toPlainString()
                                + " must produce integer payouts for bets in multiples of 5");
            }
            cleaned.add(mult);
        }
        return cleaned;
    }

    public static void validateBetBounds(long minBet, long maxBet) {
        if (minBet < 5 || minBet % 5 != 0) {
            throw new IllegalArgumentException("Minimum bet must be at least 5 and a multiple of 5");
        }
        if (maxBet < minBet || maxBet > 1_000_000L || maxBet % 5 != 0) {
            throw new IllegalArgumentException("Maximum bet must be >= min bet, multiple of 5, and <= 1000000");
        }
    }

    public static String serialize(List<BigDecimal> multipliers) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < multipliers.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(multipliers.get(i).stripTrailingZeros().toPlainString());
        }
        return sb.toString();
    }

    public static Map<String, Object> mathSummary(List<BigDecimal> multipliers) {
        BigDecimal sum = BigDecimal.ZERO;
        for (BigDecimal m : multipliers) {
            sum = sum.add(m);
        }
        BigDecimal rtp = sum
                .divide(BigDecimal.valueOf(SEGMENT_COUNT), 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal edge = BigDecimal.valueOf(100).subtract(rtp).setScale(2, RoundingMode.HALF_UP);
        Map<String, Object> math = new LinkedHashMap<>();
        math.put("segmentCount", SEGMENT_COUNT);
        math.put("multiplierSum", sum);
        math.put("rtpPercent", rtp);
        math.put("edgePercent", edge);
        math.put("equalChance", true);
        return math;
    }

    public static String labelFor(BigDecimal multiplier) {
        if (multiplier == null || multiplier.compareTo(BigDecimal.ZERO) == 0) {
            return "LOSE";
        }
        return multiplier.stripTrailingZeros().toPlainString() + "x";
    }

    private Map<String, Object> toView(SpinSettings settings, List<BigDecimal> multipliers) {
        List<Map<String, Object>> segments = new ArrayList<>();
        for (int i = 0; i < multipliers.size(); i++) {
            BigDecimal mult = multipliers.get(i);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("index", i);
            row.put("multiplier", mult);
            row.put("label", labelFor(mult));
            row.put("chancePercent", 10);
            segments.add(row);
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "SUCCESS");
        body.put("enabled", settings.isEnabled());
        body.put("minBet", settings.getMinBet());
        body.put("maxBet", settings.getMaxBet());
        body.put("multipliers", multipliers);
        body.put("multipliersRaw", settings.getMultipliers());
        body.put("segments", segments);
        body.put("math", mathSummary(multipliers));
        body.put("updatedAt", settings.getUpdatedAt());
        body.put("updatedBy", settings.getUpdatedBy());
        body.put("rule", "Every spin uses these admin multipliers only. No client RNG.");
        body.put("localeNote", String.format(Locale.US,
                "Theoretical edge %.2f%% (RTP %.2f%%)",
                ((BigDecimal) mathSummary(multipliers).get("edgePercent")).doubleValue(),
                ((BigDecimal) mathSummary(multipliers).get("rtpPercent")).doubleValue()));
        return body;
    }
}
