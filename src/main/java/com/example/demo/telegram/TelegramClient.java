package com.example.demo.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class TelegramClient {

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();
    private final ObjectMapper objectMapper;
    private final TelegramSettings settings;

    public TelegramClient(ObjectMapper objectMapper, TelegramSettings settings) {
        this.objectMapper = objectMapper;
        this.settings = settings;
    }

    public JsonNode getUpdates(long offset) {
        return post("getUpdates", Map.of(
                "timeout", 8,
                "offset", offset,
                "allowed_updates", List.of("message", "callback_query")),
                Duration.ofSeconds(12));
    }

    public void deleteWebhook() {
        post("deleteWebhook", Map.of("drop_pending_updates", false), Duration.ofSeconds(15));
    }

    public void send(Outgoing message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("chat_id", message.chatId());
        body.put("text", message.text());
        if (message.rows() != null && !message.rows().isEmpty()) {
            List<List<Map<String, String>>> keyboard = message.rows().stream()
                    .map(row -> row.stream()
                            .map(button -> Map.of("text", button.label(), "callback_data", button.data()))
                            .toList())
                    .toList();
            body.put("reply_markup", Map.of("inline_keyboard", keyboard));
        }
        RuntimeException last = null;
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                post("sendMessage", body, Duration.ofSeconds(15));
                return;
            } catch (TelegramUnauthorizedException ex) {
                throw ex;
            } catch (RuntimeException ex) {
                last = ex;
            }
        }
        throw last;
    }

    public void answerCallback(String callbackId, String text) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("callback_query_id", callbackId);
        if (text != null && !text.isBlank()) {
            body.put("text", text.length() > 180 ? text.substring(0, 180) : text);
            body.put("show_alert", false);
        }
        post("answerCallbackQuery", body, Duration.ofSeconds(15));
    }

    private JsonNode post(String method, Map<String, Object> body, Duration timeout) {
        if (!settings.enabled()) {
            return objectMapper.createObjectNode();
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint(method)))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401) {
                throw new TelegramUnauthorizedException();
            }
            JsonNode root = objectMapper.readTree(response.body());
            if (!root.path("ok").asBoolean(false)) {
                if (root.path("error_code").asInt() == 401) {
                    throw new TelegramUnauthorizedException();
                }
                String description = root.path("description").asText("Telegram API call failed");
                throw new IllegalStateException(description);
            }
            return root;
        } catch (TelegramUnauthorizedException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Telegram call interrupted");
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            String detail = ex.getClass().getSimpleName();
            if (ex.getMessage() != null && !ex.getMessage().isBlank()) {
                detail = detail + ": " + ex.getMessage().replaceAll("bot\\d+:[A-Za-z0-9_-]+", "bot<hidden>");
            }
            throw new IllegalStateException(detail);
        }
    }

    private String endpoint(String method) {
        return "https://api.telegram.org/bot" + settings.token() + "/" + method;
    }
}
