package com.example.demo.repository;

import com.example.demo.entity.GameCommissionSetting;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface GameCommissionSettingRepository extends JpaRepository<GameCommissionSetting, Short> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM GameCommissionSetting s WHERE s.id = 1")
    Optional<GameCommissionSetting> findSettingsForUpdate();
}