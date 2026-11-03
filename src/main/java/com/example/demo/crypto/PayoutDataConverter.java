package com.example.demo.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * Encrypts withdrawal payout data before it is written to the database.
 * Configure PAYOUT_ENCRYPTION_KEY as Base64 of exactly 32 random bytes.
 */
@Converter
public class PayoutDataConverter implements AttributeConverter<String, String> {

    private static final String PREFIX = "v1:";
    private static final String ENV_KEY = "PAYOUT_ENCRYPTION_KEY";
    private static final int NONCE_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    public String convertToDatabaseColumn(String value) {
        if (value == null) return null;
        try {
            byte[] nonce = new byte[NONCE_LENGTH];
            RANDOM.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(TAG_LENGTH_BITS, nonce));
            byte[] encrypted = cipher.doFinal(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            byte[] payload = new byte[nonce.length + encrypted.length];
            System.arraycopy(nonce, 0, payload, 0, nonce.length);
            System.arraycopy(encrypted, 0, payload, nonce.length, encrypted.length);
            return PREFIX + Base64.getEncoder().encodeToString(payload);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Could not encrypt withdrawal payout data", ex);
        }
    }

    @Override
    public String convertToEntityAttribute(String value) {
        if (value == null) return null;
        if (!value.startsWith(PREFIX)) {
            throw new IllegalStateException("Unencrypted withdrawal payout data found; refusing unsafe fallback");
        }
        try {
            byte[] payload = Base64.getDecoder().decode(value.substring(PREFIX.length()));
            if (payload.length <= NONCE_LENGTH) {
                throw new IllegalStateException("Invalid encrypted withdrawal payout data");
            }
            byte[] nonce = Arrays.copyOfRange(payload, 0, NONCE_LENGTH);
            byte[] encrypted = Arrays.copyOfRange(payload, NONCE_LENGTH, payload.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(TAG_LENGTH_BITS, nonce));
            return new String(cipher.doFinal(encrypted), java.nio.charset.StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new IllegalStateException("Could not decrypt withdrawal payout data; verify PAYOUT_ENCRYPTION_KEY", ex);
        }
    }

    private SecretKeySpec key() {
        String configured = System.getenv(ENV_KEY);
        if (configured == null || configured.isBlank()) {
            throw new IllegalStateException(ENV_KEY + " must be configured before creating or reading withdrawal payout details");
        }
        final byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(configured.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException(ENV_KEY + " must be valid Base64", ex);
        }
        if (bytes.length != 32) {
            throw new IllegalStateException(ENV_KEY + " must decode to exactly 32 bytes");
        }
        return new SecretKeySpec(bytes, "AES");
    }
}
