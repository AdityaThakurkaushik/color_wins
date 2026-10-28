
// package com.example.demo;

// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.http.HttpStatus;
// import org.springframework.security.config.annotation.web.builders.HttpSecurity;
// import org.springframework.security.config.http.SessionCreationPolicy;
// import org.springframework.security.web.SecurityFilterChain;
// import org.springframework.security.web.authentication.HttpStatusEntryPoint;
// import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
// import org.springframework.web.cors.CorsConfiguration;
// import org.springframework.web.cors.CorsConfigurationSource;
// import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

// import java.util.List;

// @Configuration
// public class SecurityConfig {

//     private final JwtAuthenticationFilter jwtAuthenticationFilter;

//     public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
//         this.jwtAuthenticationFilter = jwtAuthenticationFilter;
//     }

//     @Bean
//     public CorsConfigurationSource corsConfigurationSource() {
//         CorsConfiguration configuration = new CorsConfiguration();

//         configuration.setAllowedOrigins(
//                 List.of(
//                         "http://localhost:5173",
//                         "http://localhost:5174",
//                         "https://color-wins.vercel.app",
//                         "https://color-wins-hl92hw923-colorwin.vercel.app"
//                 )
//         );

//         configuration.setAllowedMethods(
//                 List.of("GET", "POST", "PUT", "DELETE", "OPTIONS")
//         );

//         configuration.setAllowedHeaders(
//                 List.of("Authorization", "Content-Type")
//         );

//         UrlBasedCorsConfigurationSource source =
//                 new UrlBasedCorsConfigurationSource();

//         source.registerCorsConfiguration("/**", configuration);

//         return source;
//     }

//     @Bean
//     public SecurityFilterChain securityFilterChain(HttpSecurity http)
//             throws Exception {

//         http
//                 .cors(cors -> cors.configurationSource(
//                         corsConfigurationSource()
//                 ))
//                 .csrf(csrf -> csrf.disable())
//                 .formLogin(form -> form.disable())
//                 .httpBasic(basic -> basic.disable())
//                 .sessionManagement(session -> session
//                         .sessionCreationPolicy(
//                                 SessionCreationPolicy.STATELESS
//                         )
//                 )
//                 .authorizeHttpRequests(auth -> auth
//                         .requestMatchers(
//                                 "/api/health",
//                                 "/api/auth/register",
//                                 "/api/auth/login",
//                                 "/api/game/current",
//                                 "/api/game/results"
//                         ).permitAll()
//                         .requestMatchers("/api/admin/**").hasRole("ADMIN")
//                         .anyRequest().authenticated()
//                 )
//                 .exceptionHandling(ex -> ex
//                         .authenticationEntryPoint(
//                                 new HttpStatusEntryPoint(
//                                         HttpStatus.UNAUTHORIZED
//                                 )
//                         )
//                 )
                
//                 .addFilterBefore(
//                         jwtAuthenticationFilter,
//                         UsernamePasswordAuthenticationFilter.class
//                 );

//         return http.build();
//     }
// }






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
                        "http://localhost:5173",
                        "http://localhost:5174",
                        "https://color-wins.vercel.app",
                        "https://color-wins-hl92hw923-colorwin.vercel.app"
                )
        );

        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT", "DELETE", "OPTIONS")
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
                                "/api/health",
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/game/current",
                                "/api/game/results"
                        ).permitAll()
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