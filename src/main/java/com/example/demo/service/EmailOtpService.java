package com.example.demo.service;

import com.example.demo.entity.EmailOtp;
import com.example.demo.repository.EmailOtpRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Locale;

@Service
public class EmailOtpService {

    public static final String PURPOSE_VERIFY = "VERIFY";
    public static final String PURPOSE_RESET = "RESET";

    private final EmailOtpRepository emailOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final int ttlMinutes;
    private final int resendSeconds;
    private final int maxAttempts;
    private final SecureRandom random = new SecureRandom();

    public EmailOtpService(
            EmailOtpRepository emailOtpRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.otp.ttl-minutes:10}") int ttlMinutes,
            @Value("${app.otp.resend-seconds:60}") int resendSeconds,
            @Value("${app.otp.max-attempts:5}") int maxAttempts) {
        this.emailOtpRepository = emailOtpRepository;
        this.passwordEncoder = passwordEncoder;
        this.ttlMinutes = ttlMinutes;
        this.resendSeconds = resendSeconds;
        this.maxAttempts = maxAttempts;
    }

    @Transactional
    public String issueCode(String rawEmail, String purpose) {
        String email = normalize(rawEmail);
        requireGmail(email);

        EmailOtp latest = emailOtpRepository
                .findFirstByEmailAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(email, purpose)
                .orElse(null);

        if (latest != null
                && latest.getCreatedAt().isAfter(OffsetDateTime.now().minusSeconds(resendSeconds))) {
            throw new IllegalArgumentException(
                    "Please wait " + resendSeconds + " seconds before requesting another code");
        }

        if (latest != null && latest.getUsedAt() == null) {
            latest.setUsedAt(OffsetDateTime.now());
            emailOtpRepository.save(latest);
        }

        String code = String.format("%06d", random.nextInt(1_000_000));
        EmailOtp otp = new EmailOtp();
        otp.setEmail(email);
        otp.setPurpose(purpose);
        otp.setCodeHash(passwordEncoder.encode(code));
        otp.setExpiresAt(OffsetDateTime.now().plusMinutes(ttlMinutes));
        emailOtpRepository.save(otp);
        return code;
    }

    @Transactional
    public void consume(String rawEmail, String purpose, String code) {
        String email = normalize(rawEmail);
        requireGmail(email);

        EmailOtp otp = emailOtpRepository
                .findFirstByEmailAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired code"));

        if (otp.getExpiresAt().isBefore(OffsetDateTime.now())) {
            otp.setUsedAt(OffsetDateTime.now());
            emailOtpRepository.save(otp);
            throw new IllegalArgumentException("Invalid or expired code");
        }

        if (otp.getAttempts() >= maxAttempts) {
            otp.setUsedAt(OffsetDateTime.now());
            emailOtpRepository.save(otp);
            throw new IllegalArgumentException("Too many attempts. Request a new code");
        }

        if (!passwordEncoder.matches(code, otp.getCodeHash())) {
            otp.setAttempts(otp.getAttempts() + 1);
            emailOtpRepository.save(otp);
            throw new IllegalArgumentException("Invalid or expired code");
        }

        otp.setUsedAt(OffsetDateTime.now());
        emailOtpRepository.save(otp);
    }

    public static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    public static void requireGmail(String email) {
        if (email == null || !email.endsWith("@gmail.com")) {
            throw new IllegalArgumentException("Only Gmail addresses (@gmail.com) are allowed");
        }
    }
}
