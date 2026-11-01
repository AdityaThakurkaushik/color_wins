package com.example.demo.service;

import com.example.demo.entity.SystemWallet;
import com.example.demo.entity.SystemWalletTransaction;
import com.example.demo.repository.SystemWalletRepository;
import com.example.demo.repository.SystemWalletTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Constructor;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SystemWalletServiceTest {
    private SystemWalletRepository walletRepository;
    private SystemWalletTransactionRepository transactionRepository;
    private SystemWalletService service;
    private SystemWallet platformWallet;

    @BeforeEach
    void setUp() throws ReflectiveOperationException {
        walletRepository = mock(SystemWalletRepository.class);
        transactionRepository = mock(SystemWalletTransactionRepository.class);
        service = new SystemWalletService(walletRepository, transactionRepository);
        Constructor<SystemWallet> constructor = SystemWallet.class.getDeclaredConstructor();
        constructor.setAccessible(true);
        platformWallet = constructor.newInstance();
        ReflectionTestUtils.setField(platformWallet, "walletType", "PLATFORM");
        ReflectionTestUtils.setField(platformWallet, "balance", 10L);
        when(walletRepository.findByTypeForUpdate("PLATFORM"))
                .thenReturn(Optional.of(platformWallet));
    }

    @Test
    void fundingLocksWalletBeforeIdempotencyCheckAndRecordsOneCredit() {
        when(transactionRepository.existsByIdempotencyKey("MANUAL_PLATFORM_FUND_req-1"))
                .thenReturn(false);

        service.fundPlatformWallet(25, " req-1 ", "admin");

        assertEquals(35L, platformWallet.getBalance());
        InOrder order = inOrder(walletRepository, transactionRepository);
        order.verify(walletRepository).findByTypeForUpdate("PLATFORM");
        order.verify(transactionRepository).existsByIdempotencyKey("MANUAL_PLATFORM_FUND_req-1");
        ArgumentCaptor<SystemWalletTransaction> transaction =
                ArgumentCaptor.forClass(SystemWalletTransaction.class);
        verify(transactionRepository).save(transaction.capture());
        assertEquals("MANUAL_PLATFORM_FUND_req-1",
                ReflectionTestUtils.getField(transaction.getValue(), "idempotencyKey"));
        assertEquals("PLATFORM_FUND_CREDIT",
                ReflectionTestUtils.getField(transaction.getValue(), "transactionType"));
    }

    @Test
    void repeatedFundingRequestDoesNotChangeBalanceOrWriteLedger() {
        when(transactionRepository.existsByIdempotencyKey("MANUAL_PLATFORM_FUND_req-1"))
                .thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> service.fundPlatformWallet(25, "req-1", "admin"));

        assertEquals(10L, platformWallet.getBalance());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void insufficientPlatformBalanceIsReportedWithoutDebitOrLedgerEntry() {
        boolean debited = service.debitPlatformForRound(null, 11);

        assertFalse(debited);
        assertEquals(10L, platformWallet.getBalance());
        verify(transactionRepository, never()).save(any());
    }
}
