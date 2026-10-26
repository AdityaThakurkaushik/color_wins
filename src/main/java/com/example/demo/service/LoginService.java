
package com.example.demo.service;

import com.example.demo.JwtService;
import com.example.demo.dto.LoginRequest;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class LoginService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public String login(LoginRequest request) {
        String identifier = request.getUsernameOrEmail()
                .trim()
                .toLowerCase();

        User user = userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invalid username/email or password"));

        if (!user.isActive()
                || !passwordEncoder.matches(
                        request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException(
                    "Invalid username/email or password");
        }

        return jwtService.generateToken(user.getUsername());
    }
}
