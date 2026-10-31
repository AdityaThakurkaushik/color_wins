
package com.example.demo.service;

import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.User;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final PointsTransactionRepository transactionRepository;

    public AdminUserService(
            UserRepository userRepository,
            PointsTransactionRepository transactionRepository) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public Page<User> getUsers(String search, int page, int size) {

        if (page < 0) {
            throw new IllegalArgumentException("Invalid page number");
        }

        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("Page size must be between 1 and 100");
        }

        String keyword = search == null ? "" : search.trim();

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return userRepository.searchUsers(keyword, pageable);
    }

    @Transactional
    public User adjustPoints(
            Long userId,
            String action,
            Long amount,
            String reason,
            String idempotencyKey) {

        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        if (reason == null || reason.isBlank() || reason.trim().length() > 255) {
            throw new IllegalArgumentException("Valid reason is required (max 255 characters)");
        }

        if (idempotencyKey == null || idempotencyKey.isBlank()
                || idempotencyKey.length() > 100) {
            throw new IllegalArgumentException("Valid idempotency key is required");
        }

        String type;

        if ("CREDIT".equalsIgnoreCase(action)) {
            type = "ADMIN_CREDIT";
        } else if ("DEBIT".equalsIgnoreCase(action)) {
            type = "ADMIN_DEBIT";
        } else {
            throw new IllegalArgumentException("Action must be CREDIT or DEBIT");
        }

        if (transactionRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            throw new IllegalArgumentException("This adjustment request was already processed");
        }

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        long currentBalance = user.getVirtualPoints();
        long newBalance;

        try {
            if ("ADMIN_CREDIT".equals(type)) {
                newBalance = Math.addExact(currentBalance, amount);
            } else {
                newBalance = Math.subtractExact(currentBalance, amount);
            }
        } catch (ArithmeticException ex) {
            throw new IllegalArgumentException("Invalid points adjustment");
        }

        if (newBalance < 0) {
            throw new IllegalArgumentException("Insufficient virtual points");
        }

        user.setVirtualPoints(newBalance);

        transactionRepository.save(new PointsTransaction(
                user,
                amount,
                type,
                idempotencyKey,
                reason.trim()
        ));

        return user;
    }

    @Transactional
    public User updateStatus(Long userId, Boolean active) {

        if (active == null) {
            throw new IllegalArgumentException("Account status is required");
        }

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setActive(active);

        return user;
    }
}
