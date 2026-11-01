package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class SystemWalletService {
    private final SystemWalletRepository walletRepository;
    private final SystemWalletTransactionRepository transactionRepository;

    public SystemWalletService(SystemWalletRepository walletRepository,
            SystemWalletTransactionRepository transactionRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getBalances() {
        return walletRepository.findAll().stream().map(w -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("walletType", w.getWalletType());
            item.put("balance", w.getBalance());
            return item;
        }).toList();
    }

    @Transactional
    public void credit(String type, long amount, String transactionType,
            String key, String description) {
        SystemWallet wallet = walletRepository.findByTypeForUpdate(type)
                .orElseThrow(() -> new IllegalStateException("System wallet missing: " + type));
        wallet.credit(amount);
        transactionRepository.save(new SystemWalletTransaction(
                wallet, null, amount, transactionType, key, description));
    }

    @Transactional
    public void fundPlatformWallet(long amount, String requestId, String adminUsername) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Funding amount must be positive");
        }
        if (requestId == null || requestId.isBlank() || requestId.length() > 80) {
            throw new IllegalArgumentException("A valid request ID is required");
        }
        String key = "MANUAL_PLATFORM_FUND_" + requestId.trim();
        // Serialize request-id checks on the wallet row so concurrent calls
        // cannot both observe an unused key before either one commits.
        SystemWallet wallet = walletRepository.findByTypeForUpdate("PLATFORM")
                .orElseThrow(() -> new IllegalStateException("Platform Wallet missing"));
        if (transactionRepository.existsByIdempotencyKey(key)) {
            throw new IllegalArgumentException("This funding request has already been processed");
        }
        wallet.credit(amount);
        transactionRepository.save(new SystemWalletTransaction(wallet, null, amount,
                "PLATFORM_FUND_CREDIT", key,
                "Manual Platform Wallet funding by admin " + adminUsername));
    }

    @Transactional
    public boolean debitPlatformForRound(GameRound round, long amount) {
        if (amount <= 0) return true;
        SystemWallet wallet = walletRepository.findByTypeForUpdate("PLATFORM")
                .orElseThrow(() -> new IllegalStateException("Platform Wallet missing"));
        if (wallet.getBalance() < amount) return false;
        wallet.debit(amount);
        transactionRepository.save(new SystemWalletTransaction(wallet, round, amount,
                "SINGLE_PLAYER_REWARD_DEBIT", "ROUND_" + round.getId() + "_PLATFORM_REWARD",
                "Single-player 25% reward for round " + round.getPeriodNumber()));
        return true;
    }

    @Transactional
    public void creditAdminForRound(GameRound round, long amount, String type) {
        if (amount <= 0) return;
        SystemWallet wallet = walletRepository.findByTypeForUpdate("ADMIN")
                .orElseThrow(() -> new IllegalStateException("Admin Wallet missing"));
        wallet.credit(amount);
        transactionRepository.save(new SystemWalletTransaction(wallet, round, amount,
                type, "ROUND_" + round.getId() + "_" + type,
                "Settlement credit for round " + round.getPeriodNumber()));
    }
}
