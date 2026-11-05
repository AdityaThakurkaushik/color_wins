package com.example.demo.service;

import com.example.demo.repository.DepositRepository;
import com.example.demo.repository.PlatformWalletPolicyAuditRepository;
import com.example.demo.repository.PlatformWalletPolicyRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.UserWalletPolicyOverrideRepository;
import com.example.demo.repository.WithdrawalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WalletPolicyServiceTest {

    @Mock PlatformWalletPolicyRepository policyRepository;
    @Mock UserWalletPolicyOverrideRepository overrideRepository;
    @Mock PlatformWalletPolicyAuditRepository auditRepository;
    @Mock UserRepository userRepository;
    @Mock DepositRepository depositRepository;
    @Mock WithdrawalRepository withdrawalRepository;

    WalletPolicyService service;

    @BeforeEach
    void setUp() {
        service = new WalletPolicyService(
                policyRepository,
                overrideRepository,
                auditRepository,
                userRepository,
                depositRepository,
                withdrawalRepository);
    }

    @Test
    void blocksFirstWithdrawalWhenApprovedDepositsAreBelowRequirement() {
        WalletPolicyService.ResolvedPolicy policy = new WalletPolicyService.ResolvedPolicy(
                true, 100L, true, 100L, true, 200L);
        when(withdrawalRepository.existsByUserIdAndStatus(9L, "PAID")).thenReturn(false);
        when(depositRepository.sumApprovedDeposits(9L)).thenReturn(99L);

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> service.enforceFirstWithdrawal(9L, policy));
        assertEquals(
                "You must deposit at least ₹100 to become eligible for your first withdrawal.",
                error.getMessage());
    }

    @Test
    void allowsFirstWithdrawalWhenApprovedDepositsMeetRequirement() {
        WalletPolicyService.ResolvedPolicy policy = new WalletPolicyService.ResolvedPolicy(
                true, 100L, true, 100L, true, 200L);
        when(withdrawalRepository.existsByUserIdAndStatus(9L, "PAID")).thenReturn(false);
        when(depositRepository.sumApprovedDeposits(9L)).thenReturn(100L);
        assertDoesNotThrow(() -> service.enforceFirstWithdrawal(9L, policy));
    }

    @Test
    void skipsCheckAfterPaidWithdrawal() {
        WalletPolicyService.ResolvedPolicy policy = new WalletPolicyService.ResolvedPolicy(
                true, 100L, true, 100L, true, 200L);
        when(withdrawalRepository.existsByUserIdAndStatus(9L, "PAID")).thenReturn(true);
        assertDoesNotThrow(() -> service.enforceFirstWithdrawal(9L, policy));
    }

    @Test
    void skipsCheckWhenDisabled() {
        WalletPolicyService.ResolvedPolicy policy = new WalletPolicyService.ResolvedPolicy(
                true, 100L, false, 100L, true, 200L);
        assertDoesNotThrow(() -> service.enforceFirstWithdrawal(9L, policy));
    }
}
