package com.example.demo;

import com.example.demo.dto.RegisterRequest;
import com.example.demo.entity.PaymentMethod;
import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.User;
import com.example.demo.repository.PaymentMethodRepository;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.DepositService;
import com.example.demo.service.RegistrationService;
import com.example.demo.service.WalletHistoryService;
import com.example.demo.service.WalletPolicyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class WalletRulesIntegrationTest {

    @Autowired RegistrationService registrationService;
    @Autowired UserRepository userRepository;
    @Autowired PointsTransactionRepository pointsTransactionRepository;
    @Autowired DepositService depositService;
    @Autowired WalletHistoryService walletHistoryService;
    @Autowired WalletPolicyService walletPolicyService;
    @Autowired PaymentMethodRepository paymentMethodRepository;

    private long unique;

    @BeforeEach
    void seedPayee() {
        unique = System.nanoTime();
        if (paymentMethodRepository.findAll().stream().noneMatch(PaymentMethod::isActive)) {
            paymentMethodRepository.save(new PaymentMethod("Test UPI", "test@upi", true, 1));
        }
    }

    @Test
    void newUserGetsOneHundredSignupBonusOnce() {
        User user = register("bonus");
        assertEquals(100L, user.getVirtualPoints());
        PointsTransaction bonus = pointsTransactionRepository
                .findByIdempotencyKey("SIGNUP_BONUS_" + user.getId())
                .orElseThrow();
        assertEquals(100L, bonus.getAmount());
        assertEquals("SIGNUP_BONUS", bonus.getTransactionType());

        long before = user.getVirtualPoints();
        registrationService.register(request("bonus2"));
        assertEquals(before, userRepository.findById(user.getId()).orElseThrow().getVirtualPoints());
    }

    @Test
    void depositNinetyNineRejectedAndHundredAccepted() {
        User user = register("dep");
        IllegalArgumentException low = assertThrows(
                IllegalArgumentException.class,
                () -> depositService.create(user.getId(), 99L));
        assertTrue(low.getMessage().contains("100"));
        assertDoesNotThrow(() -> depositService.create(user.getId(), 100L));
    }

    @Test
    void withdrawalMinimumAndFirstDepositGate() {
        User user = register("wd");
        user.setVirtualPoints(5000L);
        userRepository.save(user);

        IllegalArgumentException tooLow = assertThrows(
                IllegalArgumentException.class,
                () -> withdraw(user.getId(), 199L));
        assertTrue(tooLow.getMessage().contains("200"));

        IllegalArgumentException gated = assertThrows(
                IllegalArgumentException.class,
                () -> withdraw(user.getId(), 200L));
        assertEquals(
                "You must deposit at least ₹100 to become eligible for your first withdrawal.",
                gated.getMessage());
        assertEquals(5000L, userRepository.findById(user.getId()).orElseThrow().getVirtualPoints());
    }

    @Test
    void adminCanDisableFirstWithdrawalRequirement() {
        User user = register("skip");
        user.setVirtualPoints(5000L);
        userRepository.save(user);
        walletPolicyService.updateGlobal("admin-test", new WalletPolicyService.PolicyUpdate(
                null, null, false, null, null, null, false, false, false));
        assertDoesNotThrow(() -> withdraw(user.getId(), 200L));
    }

    private void withdraw(Long userId, long amount) {
        walletHistoryService.requestWithdrawal(
                userId, amount, "UPI", "Test User", "player@upi", null, null, null);
    }

    private User register(String prefix) {
        RegisterRequest request = request(prefix);
        registrationService.register(request);
        registrationService.completeEmailVerification(request.getEmail());
        return userRepository.findByEmail(request.getEmail()).orElseThrow();
    }

    private RegisterRequest request(String prefix) {
        RegisterRequest request = new RegisterRequest();
        request.setName(prefix + " User");
        request.setState("Maharashtra");
        request.setEmail(prefix + unique + "@gmail.com");
        request.setMobileNumber(String.format("9%09d", Math.abs((prefix + unique).hashCode()) % 1_000_000_000));
        request.setAge(21);
        request.setPassword("password1");
        return request;
    }
}
