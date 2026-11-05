package com.example.demo.repository;

import com.example.demo.entity.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {

    Optional<EmailOtp> findFirstByEmailAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
            String email,
            String purpose);
}
