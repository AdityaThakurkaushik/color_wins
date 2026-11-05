package com.example.demo.util;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ImageDataUrlsTest {

    @Test
    void blankClearsPhoto() {
        assertNull(ImageDataUrls.normalize("  "));
    }

    @Test
    void acceptsJpegMagicBytes() {
        byte[] jpeg = new byte[32];
        jpeg[0] = (byte) 0xFF;
        jpeg[1] = (byte) 0xD8;
        jpeg[2] = (byte) 0xFF;
        String url = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(jpeg);
        assertEquals(url, ImageDataUrls.normalize(url));
    }

    @Test
    void rejectsMislabeledBytes() {
        byte[] pngHeader = new byte[] {
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0
        };
        String url = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(pngHeader);
        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> ImageDataUrls.normalize(url));
        assertTrue(error.getMessage().toLowerCase().contains("jpeg")
                || error.getMessage().toLowerCase().contains("photo"));
    }

    @Test
    void rejectsSvgPayload() {
        String svg = Base64.getEncoder().encodeToString("<svg xmlns='http://www.w3.org/2000/svg'></svg>".getBytes());
        assertThrows(IllegalArgumentException.class,
                () -> ImageDataUrls.normalize("data:image/png;base64," + svg));
    }
}
