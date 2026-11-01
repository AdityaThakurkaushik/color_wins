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
    public void debitPlatformForRound(GameRound round, long amount) {
        if (amount <= 0) return;
        SystemWallet wallet = walletRepository.findByTypeForUpdate("PLATFORM")
                .orElseThrow(() -> new IllegalStateException("Platform Wallet missing"));
        wallet.debit(amount);
        transactionRepository.save(new SystemWalletTransaction(wallet, round, amount,
                "SINGLE_PLAYER_REWARD_DEBIT", "ROUND_" + round.getId() + "_PLATFORM_REWARD",
                "Single-player 25% reward for round " + round.getPeriodNumber()));
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