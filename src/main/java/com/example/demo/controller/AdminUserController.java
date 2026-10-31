
package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.service.AdminUserService;
import com.example.demo.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final UserRepository userRepository;

    public AdminUserController(
            AdminUserService adminUserService,
            UserRepository userRepository) {
        this.adminUserService = adminUserService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<UserPageResponse> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<User> result = adminUserService.getUsers(search, page, size);

        List<UserResponse> users = result.getContent()
                .stream()
                .map(UserResponse::from)
                .toList();

        return ResponseEntity.ok(new UserPageResponse(
                users,
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber(),
                result.getSize()
        ));
    }

    @GetMapping("/count")
    public ResponseEntity<UserCountResponse> getUserCount() {
        return ResponseEntity.ok(
                new UserCountResponse(userRepository.count())
        );
    }

    @PostMapping("/{userId}/wallet-adjustment")
    public ResponseEntity<UserResponse> adjustPoints(
            @PathVariable Long userId,
            @RequestBody WalletAdjustmentRequest request) {

        User user = adminUserService.adjustPoints(
                userId,
                request.action(),
                request.amount(),
                request.reason(),
                request.idempotencyKey()
        );

        return ResponseEntity.ok(UserResponse.from(user));
    }

    @PatchMapping("/{userId}/status")
    public ResponseEntity<UserResponse> updateStatus(
            @PathVariable Long userId,
            @RequestBody StatusRequest request) {

        User user = adminUserService.updateStatus(
                userId,
                request.active()
        );

        return ResponseEntity.ok(UserResponse.from(user));
    }

    public record UserResponse(
            Long id,
            String username,
            String email,
            String mobileNumber,
            Long virtualPoints,
            Boolean active,
            OffsetDateTime createdAt
    ) {
        public static UserResponse from(User user) {
            return new UserResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getMobileNumber(),
                    user.getVirtualPoints(),
                    user.getActive(),
                    user.getCreatedAt()
            );
        }
    }

    public record UserPageResponse(
            List<UserResponse> content,
            long totalElements,
            int totalPages,
            int number,
            int size
    ) {}

    public record UserCountResponse(long totalUsers) {}

    public record WalletAdjustmentRequest(
            String action,
            Long amount,
            String reason,
            String idempotencyKey
    ) {}

    public record StatusRequest(Boolean active) {}
}
