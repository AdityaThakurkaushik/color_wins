package com.example.demo.telegram;

import java.util.List;

public record BotTurn(String callbackText, List<Outgoing> messages) {

    public static BotTurn say(long chatId, String text) {
        return new BotTurn(null, List.of(Outgoing.text(chatId, text)));
    }

    public static BotTurn messages(String callbackText, List<Outgoing> messages) {
        return new BotTurn(callbackText, messages);
    }
}
