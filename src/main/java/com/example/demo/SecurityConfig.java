



package com.example.demo;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(
                List.of(
                        "https://millionairehub.tech",
                        "http://localhost:5173",
                        "http://localhost:5174",
                        "http://127.0.0.1:5173",
                        "http://127.0.0.1:5174",
                        "https://color-wins.vercel.app",
                        "https://color-wins-hl92hw923-colorwin.vercel.app"
                )
        );

      configuration.setAllowedMethods(
        List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
);
        configuration.setAllowedHeaders(
                List.of("Authorization", "Content-Type")
        );

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    // Prevent duplicate servlet-container registration.
    // The JWT filter will run through Spring Security's filter chain.
    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter>
            disableJwtServletRegistration() {

        FilterRegistrationBean<JwtAuthenticationFilter> registration =
                new FilterRegistrationBean<>();

        registration.setFilter(jwtAuthenticationFilter);
        registration.setEnabled(false);

        return registration;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
                .cors(cors -> cors.configurationSource(
                        corsConfigurationSource()
                ))
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                AntPathRequestMatcher.antMatcher("/api/health"),
                                AntPathRequestMatcher.antMatcher("/api/auth/register"),
                                AntPathRequestMatcher.antMatcher("/api/auth/login"),
                                AntPathRequestMatcher.antMatcher("/api/auth/verify-email"),
                                AntPathRequestMatcher.antMatcher("/api/auth/verification-status"),
                                AntPathRequestMatcher.antMatcher("/api/auth/resend-otp"),
                                AntPathRequestMatcher.antMatcher("/api/auth/forgot-password"),
                                AntPathRequestMatcher.antMatcher("/api/auth/reset-password"),
                                AntPathRequestMatcher.antMatcher("/api/game/current"),
                                AntPathRequestMatcher.antMatcher("/api/game/results"),
                                AntPathRequestMatcher.antMatcher("/api/leaderboard"),
                                AntPathRequestMatcher.antMatcher("/api/leaderboard/**"),
                                AntPathRequestMatcher.antMatcher("/api/referral-settings"),
                                AntPathRequestMatcher.antMatcher("/api/agent/login")
                        ).permitAll()
                        .requestMatchers("/api/approval/**").hasRole("APPROVAL_AGENT")
                        .requestMatchers("/api/withdraw-agent/**").hasRole("WITHDRAW_AGENT")
                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(
                                new HttpStatusEntryPoint(
                                        HttpStatus.UNAUTHORIZED
                                )
                        )
                )
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}