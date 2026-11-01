package com.example.demo.controller;

import com.example.demo.JwtAuthenticationFilter;
import com.example.demo.SecurityConfig;
import com.example.demo.service.GameCommissionService;
import com.example.demo.service.SystemWalletService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = GameSettlementAdminController.class,
        properties = "app.jwt.secret=test-only-secret-with-at-least-32-bytes")
@Import(SecurityConfig.class)
class GameSettlementAuthorizationTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private GameCommissionService commissionService;

    @MockitoBean
    private SystemWalletService walletService;

    @Test
    void adminSettlementSettingsRejectsAnonymousAndNonAdminUsers() throws Exception {
        mockMvc.perform(get("/api/admin/game-settlement/settings"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/game-settlement/settings")
                        .with(user("player").roles("USER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanReadSettlementSettings() throws Exception {
        when(commissionService.getCurrentPercent()).thenReturn(new BigDecimal("5.00"));

        mockMvc.perform(get("/api/admin/game-settlement/settings")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
    }
}
