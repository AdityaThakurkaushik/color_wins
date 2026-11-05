package com.example.demo.util;

import java.util.Base64;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ImageDataUrls {

    public static final int MAX_DATA_URL_CHARS = 200_000;
    public static final int MAX_DECODED_BYTES = 80_000;

    private static final Pattern PATTERN = Pattern.compile(
            "^data:image/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$");

    private ImageDataUrls() {
    }

    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim();
        if (value.length() > MAX_DATA_URL_CHARS) {
            throw new IllegalArgumentException("Photo is too large");
        }
        Matcher matcher = PATTERN.matcher(value);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Upload a JPEG, PNG or WebP photo");
        }
        String declared = matcher.group(1).toLowerCase(Locale.ROOT);
        if ("jpg".equals(declared)) {
            declared = "jpeg";
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(matcher.group(2));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Upload a JPEG, PNG or WebP photo");
        }
        if (bytes.length < 12) {
            throw new IllegalArgumentException("Upload a JPEG, PNG or WebP photo");
        }
        if (bytes.length > MAX_DECODED_BYTES) {
            throw new IllegalArgumentException("Photo is too large");
        }
        String detected = detect(bytes);
        if (detected.isEmpty() || !detected.equals(declared)) {
            throw new IllegalArgumentException("Upload a JPEG, PNG or WebP photo");
        }
        return "data:image/" + detected + ";base64," + matcher.group(2);
    }

    static String detect(byte[] bytes) {
        if (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF) {
            return "jpeg";
        }
        if (bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
                && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A) {
            return "png";
        }
        if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "webp";
        }
        return "";
    }
}
