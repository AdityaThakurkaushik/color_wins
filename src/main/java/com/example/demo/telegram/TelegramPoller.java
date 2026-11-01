package com.example.demo.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicReference;

@Component
public class TelegramPoller implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(TelegramPoller.class);
    private static final AtomicReference<Thread> ACTIVE = new AtomicReference<>();

    private volatile boolean running = true;

    private final TelegramSettings settings;
    private final TelegramClient client;
    private final TelegramUpdateService updateService;

    public TelegramPoller(
            TelegramSettings settings,
            TelegramClient client,
            TelegramUpdateService updateService) {
        this.settings = settings;
        this.client = client;
        this.updateService = updateService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!settings.enabled()) {
            log.info("Telegram bot is off because BOT_TOKEN is missing");
            return;
        }
        Thread previous = ACTIVE.get();
        if (previous != null) {
            previous.interrupt();
        }
        Thread thread = new Thread(this::loop, "telegram-bot");
        thread.setDaemon(true);
        ACTIVE.set(thread);
        thread.start();
    }

    @PreDestroy
    public void stop() {
        running = false;
        Thread thread = ACTIVE.get();
        if (thread != null) {
            thread.interrupt();
        }
    }

    private void loop() {
        log.info("Telegram bot polling started for @{}", settings.username());
        try {
            client.deleteWebhook();
        } catch (TelegramUnauthorizedException ex) {
            log.error("Telegram rejected BOT_TOKEN. Bot stopped.");
            return;
            } catch (RuntimeException ex) {
                log.warn("Telegram webhook clear failed: {}", ex.getMessage());
            }

        long offset = 0;
        while (running && !Thread.currentThread().isInterrupted()) {
            try {
                JsonNode response = client.getUpdates(offset);
                for (JsonNode update : response.path("result")) {
                    long updateId = update.path("update_id").asLong();
                    try {
                        dispatch(update);
                    } catch (RuntimeException ex) {
                        log.warn("Telegram update failed: {}", ex.getMessage());
                    }
                    offset = updateId + 1;
                }
            } catch (TelegramUnauthorizedException ex) {
                log.error("Telegram rejected BOT_TOKEN. Bot stopped.");
                return;
            } catch (RuntimeException ex) {
                log.warn("Telegram poll failed: {}", ex.getMessage());
                sleep();
            }
        }
    }

    private void dispatch(JsonNode update) {
        if (update.hasNonNull("callback_query")) {
            JsonNode callback = update.path("callback_query");
            long fromId = callback.path("from").path("id").asLong();
            long chatId = callback.path("message").path("chat").path("id").asLong(fromId);
            String callbackId = callback.path("id").asText();
            try {
                client.answerCallback(callbackId, "OK");
            } catch (RuntimeException ex) {
                log.warn("Telegram button reply skipped: {}", ex.getMessage());
            }
            BotTurn turn = updateService.onCallback(chatId, fromId, callback.path("data").asText(""));
            deliver(turn);
            return;
        }

        JsonNode message = update.path("message");
        if (!"private".equals(message.path("chat").path("type").asText())) {
            return;
        }
        if (!message.hasNonNull("text") || !message.path("from").hasNonNull("id")) {
            return;
        }
        BotTurn turn = updateService.onMessage(
                message.path("chat").path("id").asLong(),
                message.path("from").path("id").asLong(),
                message.path("text").asText());
        deliver(turn);
    }

    private void deliver(BotTurn turn) {
        for (Outgoing outgoing : turn.messages()) {
            client.send(outgoing);
        }
    }

    private void sleep() {
        try {
            Thread.sleep(800);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }
}
