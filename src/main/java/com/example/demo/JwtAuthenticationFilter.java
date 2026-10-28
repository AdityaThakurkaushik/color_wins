package com.example.demo;

import com.example.demo.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final SecretKey secretKey;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(
            @Value("${app.jwt.secret}") String secret,
            UserRepository userRepository) {

        this.secretKey = Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8));

        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            System.err.println(
                    "JWT: Missing or invalid Authorization header for "
                            + request.getRequestURI());

            filterChain.doFilter(request, response);
            return;
        }

        try {
            String token = header.substring(7);

            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String username = claims.getSubject();

            System.err.println("JWT: Token validated successfully");
            System.err.println("JWT: Subject present = "
                    + (username != null && !username.isBlank()));

            if (username == null || username.isBlank()) {
                SecurityContextHolder.clearContext();
                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Invalid token subject");
                return;
            }

            var userOptional =
                    userRepository.findByUsername(username);

            System.err.println(
                    "JWT: User found = " + userOptional.isPresent());

            if (userOptional.isEmpty()) {
                SecurityContextHolder.clearContext();
                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "User not found");
                return;
            }

            var user = userOptional.get();

            System.err.println(
                    "JWT: Account active = " + user.isActive());

            if (!user.isActive()) {
                SecurityContextHolder.clearContext();
                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Account inactive");
                return;
            }

            var authentication =
                    new UsernamePasswordAuthenticationToken(
                            user.getUsername(),
                            null,
                            List.of(new SimpleGrantedAuthority(
                                    "ROLE_" + user.getRole())));

            SecurityContextHolder.getContext()
                    .setAuthentication(authentication);

            System.err.println(
                    "JWT: Authentication established; role = "
                            + user.getRole());

        } catch (JwtException | IllegalArgumentException ex) {
            SecurityContextHolder.clearContext();

            // Log exception type only; never log the token.
            System.err.println(
                    "JWT: Validation failed = "
                            + ex.getClass().getSimpleName());

            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"status\":\"ERROR\","
                            + "\"message\":\"Invalid or expired token\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}