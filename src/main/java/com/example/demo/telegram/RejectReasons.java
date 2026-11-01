package com.example.demo.telegram;

import java.util.List;

public final class RejectReasons {

    public static final List<String> DEPOSIT = List.of(
            "Payment not matched with UTR/UPI transaction ID",
            "wrong UTR/UPI transaction ID",
            "Payment Not Received",
            "Wrong UTR/UPI transaction ID and amount",
            "Due to technical reason.");

    public static final List<String> WITHDRAW = List.of(
            "Due to a technical reason, withdrawal may take up to 12 hours. Thanks for your patience.",
            "Bank details do not match the account name.",
            "This payout could not be completed. Your coins were returned.",
            "Withdrawal request was cancelled. Your coins were returned.",
            "Daily withdrawal limit reached. Please try again later.");

    private RejectReasons() {
    }

    public static List<String> forPublicId(String publicId) {
        return publicId != null && publicId.startsWith("WD-") ? WITHDRAW : DEPOSIT;
    }

    public static String byNumber(String publicId, int number) {
        List<String> reasons = forPublicId(publicId);
        if (number < 1 || number > reasons.size()) {
            throw new IllegalArgumentException("Unknown reason");
        }
        return reasons.get(number - 1);
    }
}
