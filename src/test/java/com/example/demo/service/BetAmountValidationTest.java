package com.example.demo.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BetAmountValidationTest {

    @Test
    void rejectsBelowFive() {
        for (Long amount : new Long[] {null, 4L, 1L, 0L, -3L}) {
            IllegalArgumentException error = assertThrows(
                    IllegalArgumentException.class,
                    () -> BetService.validateBetAmount(amount));
            assertEquals("Minimum bet is 5 points.", error.getMessage());
        }
    }

    @Test
    void acceptsFiveAndPresets() {
        for (long amount : new long[] {5L, 10L, 20L, 50L, 100L, 1000L, 10000L}) {
            assertDoesNotThrow(() -> BetService.validateBetAmount(amount));
        }
    }
}
