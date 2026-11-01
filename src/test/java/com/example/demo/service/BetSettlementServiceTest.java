package com.example.demo.service;

import com.example.demo.entity.Bet;
import com.example.demo.entity.GameRound;
import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.User;
import com.example.demo.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BetSettlementServiceTest {
    private BetRepository betRepository;
    private GameRoundRepository roundRepository;
    private GameControlRepository gameControlRepository;
    private PointsTransactionRepository transactionRepository;
    private UserRepository userRepository;
    private SystemWalletService walletService;
    private BetService service;

    @BeforeEach
    void setUp() {
        betRepository = mock(BetRepository.class);
        roundRepository = mock(GameRoundRepository.class);
        gameControlRepository = mock(GameControlRepository.class);
        transactionRepository = mock(PointsTransactionRepository.class);
        userRepository = mock(UserRepository.class);
        walletService = mock(SystemWalletService.class);
        service = new BetService(betRepository, roundRepository, gameControlRepository,
                transactionRepository, userRepository, walletService);
    }

    @Test
    void singlePlayerSettlementReturnsStakeAndBonusWhenPlatformCanPay() {
        GameRound round = round(10L);
        User user = user(1L, 5L);
        Bet first = bet(user, round, "RED", 40L);
        Bet second = bet(user, round, "GREEN", 60L);
        when(roundRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(round));
        when(betRepository.findByRoundIdForUpdate(10L)).thenReturn(List.of(first, second));
        when(walletService.debitPlatformForRound(round, 25L)).thenReturn(true);
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(user));

        service.settleRound(10L, "RED");

        assertEquals("WON", first.getStatus());
        assertEquals("WON", second.getStatus());
        assertEquals(50L, first.getPointsPayout());
        assertEquals(75L, second.getPointsPayout());
        assertEquals(130L, user.getVirtualPoints());
        assertEquals("SETTLED", round.getSettlementStatus());
        verify(walletService).debitPlatformForRound(round, 25L);
        verify(transactionRepository).save(argThat(tx ->
                tx.getTransactionType().equals("BET_PAYOUT")
                        && tx.getIdempotencyKey().equals("ROUND_10_SINGLE_PLAYER_1")
                        && tx.getAmount() == 125L));
    }

    @Test
    void insufficientPlatformBalanceCancelsRoundAndRefundsEveryStakeOnce() {
        GameRound round = round(11L);
        User user = user(2L, 5L);
        Bet first = bet(user, round, "RED", 40L);
        Bet second = bet(user, round, "GREEN", 60L);
        when(roundRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(round));
        when(betRepository.findByRoundIdForUpdate(11L)).thenReturn(List.of(first, second));
        when(walletService.debitPlatformForRound(round, 25L)).thenReturn(false);
        when(userRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(user));

        service.settleRound(11L, "RED");

        assertEquals("CANCELLED", round.getSettlementStatus());
        assertEquals(100L, round.getTotalPool());
        assertEquals(0L, round.getCommissionAmount());
        assertEquals("CANCELLED", first.getStatus());
        assertEquals("CANCELLED", second.getStatus());
        assertEquals(40L, first.getPointsPayout());
        assertEquals(60L, second.getPointsPayout());
        assertEquals(105L, user.getVirtualPoints());
        verify(transactionRepository).save(argThat(tx ->
                tx.getTransactionType().equals("BET_REFUND")
                        && tx.getIdempotencyKey().equals("ROUND_11_REFUND_USER_2")
                        && tx.getAmount() == 100L));
        verify(walletService, never()).creditAdminForRound(any(), anyLong(), anyString());

        assertThrows(IllegalArgumentException.class, () -> service.settleRound(11L, "RED"));
        verify(transactionRepository, times(1)).save(any(PointsTransaction.class));
    }

    @Test
    void multiPlayerSettlementAllocatesCommissionAndWinningPoolExactly() {
        GameRound round = round(12L);
        User winner = user(3L, 7L);
        User loser = user(4L, 0L);
        Bet winningBet = bet(winner, round, "RED", 30L);
        Bet losingBet = bet(loser, round, "GREEN", 70L);
        when(roundRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(round));
        when(betRepository.findByRoundIdForUpdate(12L)).thenReturn(List.of(winningBet, losingBet));
        when(userRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(winner));

        service.settleRound(12L, "RED");

        assertEquals("WON", winningBet.getStatus());
        assertEquals(95L, winningBet.getPointsPayout());
        assertEquals("LOST", losingBet.getStatus());
        assertEquals(102L, winner.getVirtualPoints());
        assertEquals("SETTLED", round.getSettlementStatus());
        assertEquals(100L, round.getTotalPool());
        assertEquals(5L, round.getCommissionAmount());
        assertEquals(95L, round.getWinningPool());
        verify(walletService).creditAdminForRound(round, 5L, "COMMISSION_CREDIT");
    }

    private GameRound round(long id) {
        GameRound round = new GameRound("CW-" + id, OffsetDateTime.now().minusMinutes(2),
                OffsetDateTime.now().minusMinutes(1));
        ReflectionTestUtils.setField(round, "id", id);
        round.declareResult((short) 1, "RED");
        return round;
    }

    private User user(long id, long points) {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", id);
        user.setVirtualPoints(points);
        return user;
    }

    private Bet bet(User user, GameRound round, String color, long amount) {
        return new Bet(user, round, "COLOR", color, null, amount);
    }
}
