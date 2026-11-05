package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.AngerButtonService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AngerButtonController {

    private final AngerButtonService angerButtonService;
    private final UserRepository userRepository;

    public AngerButtonController(AngerButtonService angerButtonService, UserRepository userRepository) {
        this.angerButtonService = angerButtonService;
        this.userRepository = userRepository;
    }

    @GetMapping("/api/user/anger-button")
    public AngerButtonService.Resolved mine(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return angerButtonService.resolve(user.getId());
    }

    @GetMapping("/api/admin/anger-button")
    public AngerButtonService.AdminView admin() {
        return angerButtonService.adminView();
    }

    @PutMapping("/api/admin/anger-button")
    public AngerButtonService.AdminView updateGlobal(@RequestBody LabelRequest request) {
        return angerButtonService.updateGlobal(request.label());
    }

    @PutMapping("/api/admin/anger-button/users")
    public AngerButtonService.AdminView saveUser(@RequestBody UserLabelRequest request) {
        return angerButtonService.saveDedicated(request.username(), request.label());
    }

    @DeleteMapping("/api/admin/anger-button/users/{username}")
    public AngerButtonService.AdminView deleteUser(@PathVariable String username) {
        return angerButtonService.deleteDedicated(username);
    }

    public record LabelRequest(String label) {
    }

    public record UserLabelRequest(String username, String label) {
    }
}
