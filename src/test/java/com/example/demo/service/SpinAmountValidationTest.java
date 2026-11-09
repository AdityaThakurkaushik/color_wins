package com.example.demo.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SpinAmountValidationTest {

    private static final long MIN = 5L;
    private static final long MAX = 10000L;

    @Test
    void rejectsInvalidAmounts() {
        for (Long amount : new Long[] {null, 1L, 4L, 6L, 7L, 10001L}) {
            assertThrows(IllegalArgumentException.class,
                    () -> SpinService.validateSpinAmount(amount, MIN, MAX));
        }
    }

    @Test
    void acceptsMultiplesOfFive() {
        for (long amount : new long[] {5L, 10L, 20L, 50L, 100L, 1000L}) {
            assertDoesNotThrow(() -> SpinService.validateSpinAmount(amount, MIN, MAX));
        }
    }

    @Test
    void payoutsStayIntegerForDefaultCatalog() {
        List<BigDecimal> multipliers = SpinSettingsService.parseAndValidateMultipliers(
                SpinSettingsService.DEFAULT_MULTIPLIERS);
        for (BigDecimal mult : multipliers) {
            assertEquals(0L, SpinService.payoutFor(5L, mult) % 1L);
            assertEquals(0L, SpinService.payoutFor(50L, mult) % 1L);
            assertEquals(0L, SpinService.payoutFor(100L, mult) % 1L);
        }
        assertEquals(0L, SpinService.payoutFor(100L, BigDecimal.ZERO));
        assertEquals(120L, SpinService.payoutFor(100L, new BigDecimal("1.20")));
        assertEquals(200L, SpinService.payoutFor(100L, new BigDecimal("2.00")));
        assertEquals(60L, SpinService.payoutFor(50L, new BigDecimal("1.20")));
        assertEquals(90L, SpinService.payoutFor(50L, new BigDecimal("1.80")));
    }

    @Test
    void defaultCatalogEdgeIsTwentyPercent() {
        List<BigDecimal> multipliers = SpinSettingsService.parseAndValidateMultipliers(
                SpinSettingsService.DEFAULT_MULTIPLIERS);
        BigDecimal sum = BigDecimal.ZERO;
        for (BigDecimal mult : multipliers) {
            sum = sum.add(mult);
        }
        assertEquals(0, sum.compareTo(new BigDecimal("8.00")));
        assertEquals(10, multipliers.size());
        assertEquals(0, ((BigDecimal) SpinSettingsService.mathSummary(multipliers).get("edgePercent"))
                .compareTo(new BigDecimal("20.00")));
    }
}
