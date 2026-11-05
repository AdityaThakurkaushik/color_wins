package com.example.demo.util;

public final class DisplayNames {

    private DisplayNames() {
    }

    public static String normalize(String raw) {
        String name = raw == null ? "" : raw.trim().replaceAll("\\s+", " ");
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (name.length() < 2 || name.length() > 40) {
            throw new IllegalArgumentException("Name must be 2 to 40 characters");
        }
        if (!name.matches("[\\p{L}\\p{N} .'-]+")) {
            throw new IllegalArgumentException("Name can contain letters, numbers, spaces, . ' -");
        }
        return name;
    }
}
