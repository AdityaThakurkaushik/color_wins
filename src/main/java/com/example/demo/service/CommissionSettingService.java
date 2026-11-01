package com.example.demo.service;

import com.example.demo.entity.CommissionSetting;
import com.example.demo.repository.CommissionSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class CommissionSettingService {

    private final CommissionSettingRepository commissionSettingRepository;

    public CommissionSettingService(
            CommissionSettingRepository commissionSettingRepository
    ) {
        this.commissionSettingRepository = commissionSettingRepository;
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentCommission() {
        return commissionSettingRepository.findById((short) 1)
                .orElseThrow(() ->
                        new IllegalStateException("Commission setting not found"))
                .getCommissionPercent();
    }

    @Transactional
    public BigDecimal updateCommission(BigDecimal newCommission) {

        CommissionSetting setting = commissionSettingRepository
                .findByIdForUpdate((short) 1)
                .orElseThrow(() ->
                        new IllegalStateException("Commission setting not found"));

        setting.setCommissionPercent(newCommission);

        commissionSettingRepository.save(setting);

        return setting.getCommissionPercent();
    }
}