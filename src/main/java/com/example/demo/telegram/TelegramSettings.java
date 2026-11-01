package com.example.demo.telegram;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@Component
public class TelegramSettings {

    private final String token;
    private final String username;
    private final Set<Long> adminIds;

    public TelegramSettings() {
        Map<String, String> file = readDotEnv(Path.of(".env"));
        this.token = blankToNull(first("BOT_TOKEN", file));
        String name = blankToNull(first("BOT_USERNAME", file));
        this.username = name == null ? "" : name.replaceFirst("^@", "");
        this.adminIds = parseIds(first("ADMIN_TELEGRAM_IDS", file));
    }

    public boolean enabled() {
        return token != null && token.contains(":");
    }

    public String token() {
        return token;
    }

    public String username() {
        return username;
    }

    public Set<Long> adminIds() {
        return adminIds;
    }

    public boolean isAdmin(long telegramId) {
        return adminIds.contains(telegramId);
    }

    private static String first(String key, Map<String, String> file) {
        String env = System.getenv(key);
        if (env != null && !env.isBlank()) {
            return env.trim();
        }
        return file.get(key);
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static Set<Long> parseIds(String raw) {
        Set<Long> ids = new LinkedHashSet<>();
        if (raw == null || raw.isBlank()) {
            return ids;
        }
        for (String part : raw.split(",")) {
            String trimmed = part.trim();
            if (trimmed.matches("\\d+")) {
                ids.add(Long.parseLong(trimmed));
            }
        }
        return ids;
    }

    private static Map<String, String> readDotEnv(Path path) {
        if (!Files.isRegularFile(path)) {
            return Map.of();
        }
        Map<String, String> values = new HashMap<>();
        try {
            for (String line : Files.readAllLines(path)) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                int split = trimmed.indexOf('=');
                if (split <= 0) {
                    continue;
                }
                String key = trimmed.substring(0, split).trim();
                String value = trimmed.substring(split + 1).trim();
                if (value.length() >= 2
                        && ((value.startsWith("\"") && value.endsWith("\""))
                        || (value.startsWith("'") && value.endsWith("'")))) {
                    value = value.substring(1, value.length() - 1);
                }
                values.put(key, value);
            }
        } catch (IOException ex) {
            return Map.of();
        }
        return values;
    }
}
