package com.example.demo.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BetAmountValidationTest {

    @Test
    void rejectsFiveAndBelow() {
        for (Long amount : new Long[] {null, 5L, 1L, 0L, -3L}) {
            IllegalArgumentException error = assertThrows(
                    IllegalArgumentException.class,
                    () -> BetService.validateBetAmount(amount));
            assertEquals("Please enter above 5", error.getMessage());
        }
    }

    @Test
    void acceptsSixAndPresets() {
        for (long amount : new long[] {6L, 10L, 20L, 30L, 40L, 50L, 100L, 1000L, 10000L}) {
            assertDoesNotThrow(() -> BetService.validateBetAmount(amount));
        }
    }
}
