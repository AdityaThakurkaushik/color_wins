package com.example.demo.telegram;

import java.util.List;

public record Outgoing(
        long chatId,
        String text,
        List<List<Button>> rows) {

    public record Button(String label, String data) {
    }

    public static Outgoing text(long chatId, String text) {
        return new Outgoing(chatId, text, List.of());
    }

    public static Outgoing choice(
            long chatId,
            String text,
            String okLabel,
            String okData,
            String noLabel,
            String noData) {
        return new Outgoing(chatId, text, List.of(List.of(
                new Button(okLabel, okData),
                new Button(noLabel, noData))));
    }

    public static Outgoing reasons(long chatId, String text, String publicId) {
        List<String> reasons = RejectReasons.forPublicId(publicId);
        List<List<Button>> rows = new java.util.ArrayList<>();
        for (int i = 0; i < reasons.size(); i++) {
            String reason = reasons.get(i);
            String label = reason.length() > 60 ? reason.substring(0, 57) + "..." : reason;
            rows.add(List.of(new Button(label, (i + 1) + ":" + publicId)));
        }
        return new Outgoing(chatId, text, rows);
    }
}
