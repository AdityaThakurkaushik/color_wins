package com.example.demo;

import com.example.demo.repository.SystemWalletRepository;
import com.example.demo.repository.SystemWalletTransactionRepository;
import com.example.demo.service.SystemWalletService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "app.jwt.secret=test-only-secret-with-at-least-32-bytes")
class FundingIdempotencyConcurrencyIntegrationTest {
    @Autowired
    private SystemWalletService walletService;

    @Autowired
    private SystemWalletRepository walletRepository;

    @Autowired
    private SystemWalletTransactionRepository transactionRepository;

    @Test
    void concurrentDuplicateFundingRequestCreditsPlatformOnlyOnce() throws Exception {
        String requestId = UUID.randomUUID().toString();
        String key = "MANUAL_PLATFORM_FUND_" + requestId;
        long amount = 37L;
        long before = walletRepository.findByWalletType("PLATFORM")
                .orElseThrow().getBalance();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<Boolean> first = executor.submit(() -> fund(requestId, ready, start));
            Future<Boolean> second = executor.submit(() -> fund(requestId, ready, start));
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();

            int successfulRequests = (first.get(10, TimeUnit.SECONDS) ? 1 : 0)
                    + (second.get(10, TimeUnit.SECONDS) ? 1 : 0);
            long after = walletRepository.findByWalletType("PLATFORM")
                    .orElseThrow().getBalance();
            assertEquals(1, successfulRequests);
            assertEquals(amount, after - before);
            assertTrue(transactionRepository.existsByIdempotencyKey(key));
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }

    private boolean fund(String requestId, CountDownLatch ready, CountDownLatch start)
            throws InterruptedException {
        ready.countDown();
        assertTrue(start.await(5, TimeUnit.SECONDS));
        try {
            walletService.fundPlatformWallet(37L, requestId, "concurrency-test-admin");
            return true;
        } catch (IllegalArgumentException duplicate) {
            return false;
        }
    }
}
