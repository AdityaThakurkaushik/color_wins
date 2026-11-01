package com.example.demo.service;

import com.example.demo.entity.GameCommissionAuditLog;
import com.example.demo.entity.GameCommissionSetting;
import com.example.demo.entity.User;
import com.example.demo.repository.GameCommissionAuditLogRepository;
import com.example.demo.repository.GameCommissionSettingRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GameCommissionService {
    private final GameCommissionSettingRepository settingsRepository;
    private final GameCommissionAuditLogRepository auditRepository;
    private final UserRepository userRepository;

    public GameCommissionService(GameCommissionSettingRepository settingsRepository,
            GameCommissionAuditLogRepository auditRepository, UserRepository userRepository) {
        this.settingsRepository = settingsRepository;
        this.auditRepository = auditRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentPercent() {
        return settingsRepository.findById((short) 1)
                .orElseThrow(() -> new IllegalStateException("Game commission settings missing"))
                .getCommissionPercent();
    }

    @Transactional
    public BigDecimal updatePercent(BigDecimal newPercent, String adminUsername) {
        if (newPercent == null || newPercent.compareTo(BigDecimal.ZERO) < 0
                || newPercent.compareTo(new BigDecimal("100")) >= 0
                || newPercent.scale() > 2) {
            throw new IllegalArgumentException("Commission must be between 0 and 99.99");
        }
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));
        if (!"ADMIN".equals(admin.getRole())) {
            throw new IllegalArgumentException("Admin access required");
        }

        GameCommissionSetting setting = settingsRepository.findSettingsForUpdate()
                .orElseThrow(() -> new IllegalStateException("Game commission settings missing"));
        BigDecimal old = setting.getCommissionPercent();
        setting.update(newPercent, admin);
        auditRepository.save(new GameCommissionAuditLog(old, newPercent, admin));
        return newPercent;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAuditHistory() {
        return auditRepository.findTop50ByOrderByChangedAtDesc().stream().map(log -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("oldPercent", log.getOldPercent());
            item.put("newPercent", log.getNewPercent());
            item.put("changedBy", log.getChangedBy() == null ? null : log.getChangedBy().getUsername());
            item.put("changedAt", log.getChangedAt());
            return item;
        }).toList();
    }
}