package com.example.demo.service;

import com.example.demo.entity.PlatformWallet;
import com.example.demo.entity.PlatformWalletTransaction;
import com.example.demo.repository.PlatformWalletRepository;
import com.example.demo.repository.PlatformWalletTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformWalletService {

    private final PlatformWalletRepository walletRepository;
    private final PlatformWalletTransactionRepository transactionRepository;

    public PlatformWalletService(
            PlatformWalletRepository walletRepository,
            PlatformWalletTransactionRepository transactionRepository
    ) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public Long getBalance() {
        return walletRepository.findById((short) 1)
                .orElseThrow(() ->
                        new IllegalStateException("Platform wallet not found"))
                .getBalance();
    }

    @Transactional
    public void credit(
            long amount,
            String transactionType,
            Long referenceId,
            String idempotencyKey,
            String description
    ) {
        validateAmount(amount);

        if (transactionRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return;
        }

        PlatformWallet wallet = walletRepository.findByIdForUpdate((short) 1)
                .orElseThrow(() ->
                        new IllegalStateException("Platform wallet not found"));

        if (transactionRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return;
        }

        wallet.credit(amount);

        transactionRepository.save(
                new PlatformWalletTransaction(
                        amount,
                        transactionType,
                        referenceId,
                        idempotencyKey,
                        description
                )
        );
    }

    @Transactional
    public void debit(
            long amount,
            String transactionType,
            Long referenceId,
            String idempotencyKey,
            String description
    ) {
        validateAmount(amount);

        if (transactionRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return;
        }

        PlatformWallet wallet = walletRepository.findByIdForUpdate((short) 1)
                .orElseThrow(() ->
                        new IllegalStateException("Platform wallet not found"));

        if (transactionRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            return;
        }

        wallet.debit(amount);

        transactionRepository.save(
                new PlatformWalletTransaction(
                        amount,
                        transactionType,
                        referenceId,
                        idempotencyKey,
                        description
                )
        );
    }

    private void validateAmount(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException(
                    "Amount must be greater than zero"
            );
        }
    }
}