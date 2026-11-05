package com.example.demo;

import com.example.demo.repository.ReferralAgentRepository;
import com.example.demo.repository.ReviewAgentRepository;
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
    private final ReviewAgentRepository reviewAgentRepository;
    private final ReferralAgentRepository referralAgentRepository;

    public JwtAuthenticationFilter(
            @Value("${app.jwt.secret}") String secret,
            UserRepository userRepository,
            ReviewAgentRepository reviewAgentRepository,
            ReferralAgentRepository referralAgentRepository) {

        this.secretKey = Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8));

        this.userRepository = userRepository;
        this.reviewAgentRepository = reviewAgentRepository;
        this.referralAgentRepository = referralAgentRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
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
            String agentKind = claims.get("agentKind", String.class);
            if ("APPROVAL".equals(agentKind) || "WITHDRAW".equals(agentKind)) {
                authenticateAgent(username, agentKind, response);
                if (response.isCommitted()) {
                    return;
                }
                filterChain.doFilter(request, response);
                return;
            }
            if ("REFERRAL".equals(agentKind)) {
                authenticateReferralAgent(username, response);
                if (response.isCommitted()) {
                    return;
                }
                filterChain.doFilter(request, response);
                return;
            }

            if (username == null || username.isBlank()) {
                SecurityContextHolder.clearContext();
                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Invalid token subject");
                return;
            }

            var userOptional =
                    userRepository.findByUsername(username);

            if (userOptional.isEmpty()) {
                SecurityContextHolder.clearContext();
                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "User not found");
                return;
            }

            var user = userOptional.get();

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

    private void authenticateAgent(String subject, String kind, HttpServletResponse response) throws IOException {
        if (subject == null || !subject.startsWith("agent:")) {
            reject(response);
            return;
        }
        long agentId;
        try {
            agentId = Long.parseLong(subject.substring("agent:".length()));
        } catch (NumberFormatException ex) {
            reject(response);
            return;
        }
        var agent = reviewAgentRepository.findById(agentId);
        if (agent.isEmpty() || !agent.get().isActive() || !kind.equals(agent.get().getKind())) {
            reject(response);
            return;
        }
        String role = "APPROVAL".equals(kind) ? "ROLE_APPROVAL_AGENT" : "ROLE_WITHDRAW_AGENT";
        var authentication = new UsernamePasswordAuthenticationToken(
                subject,
                null,
                List.of(new SimpleGrantedAuthority(role)));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private void authenticateReferralAgent(String subject, HttpServletResponse response) throws IOException {
        if (subject == null || !subject.startsWith("refagent:")) {
            reject(response);
            return;
        }
        long agentId;
        try {
            agentId = Long.parseLong(subject.substring("refagent:".length()));
        } catch (NumberFormatException ex) {
            reject(response);
            return;
        }
        var agent = referralAgentRepository.findById(agentId);
        if (agent.isEmpty() || !agent.get().isActive()) {
            reject(response);
            return;
        }
        var authentication = new UsernamePasswordAuthenticationToken(
                subject,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_REFERRAL_AGENT")));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private void reject(HttpServletResponse response) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"status\":\"ERROR\",\"message\":\"Invalid or expired token\"}");
    }
}