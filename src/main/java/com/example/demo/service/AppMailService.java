package com.example.demo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class AppMailService {

    private static final Logger log = LoggerFactory.getLogger(AppMailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String host;
    private final String username;
    private final String from;

    public AppMailService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${spring.mail.host:}") String host,
            @Value("${spring.mail.username:}") String username,
            @Value("${app.mail.from:}") String from) {
        this.mailSender = mailSender;
        this.host = host == null ? "" : host.trim();
        this.username = username == null ? "" : username.trim();
        this.from = from == null ? "" : from.trim();
    }

    public void send(String to, String subject, String body) {
        JavaMailSender sender = mailSender.getIfAvailable();
        boolean mailReady = sender != null
                && !host.isBlank()
                && !"disabled.local".equalsIgnoreCase(host)
                && !username.isBlank();
        if (!mailReady) {
            log.info("MAIL DEV to={} subject={} body={}", to, subject, body);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        String fromAddress = !this.from.isBlank()
                ? this.from
                : (!username.isBlank() ? username : "noreply@localhost");
        message.setFrom(fromAddress);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        sender.send(message);
    }
}
