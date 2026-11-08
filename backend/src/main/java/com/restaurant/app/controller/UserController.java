package com.restaurant.app.controller;

import com.restaurant.app.dto.request.*;
import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.UserResponse;
import com.restaurant.app.entity.enums.Role;
import com.restaurant.app.security.UserDetailsImpl;
import com.restaurant.app.service.AuthService;
import com.restaurant.app.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "User & Staff Management", description = "APIs Quản lý Nhân sự & Thông tin cá nhân")
public class UserController {

    private final UserService userService;
    private final AuthService authService;

    // ==========================================
    // 1. STAFF MANAGEMENT (ADMIN / MANAGER)
    // ==========================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Lấy danh sách nhân viên (Admin lấy toàn bộ/lọc; Manager lấy nhân viên chi nhánh)")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Long branchId
    ) {
        UserDetailsImpl currentUser = authService.getCurrentUser();
        boolean isManager = currentUser != null && currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));

        List<UserResponse> list;
        if (isManager && currentUser != null) {
            // Manager is strictly scoped to their own branch
            list = userService.getBranchUsers(currentUser.getBranchId(), search, role, isActive);
        } else {
            // Admin can see all branches or filter by branch
            list = userService.getAllUsers(search, role, isActive, branchId);
        }

        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Xem chi tiết nhân viên theo ID")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUserById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tạo tài khoản nhân viên mới (Chỉ Admin)")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserResponse created = userService.createUser(request);
        return ResponseEntity.ok(ApiResponse.ok("Tạo tài khoản nhân viên thành công!", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cập nhật thông tin/vai trò/chi nhánh nhân viên (Chỉ Admin)")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        UserResponse updated = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật thông tin nhân viên thành công!", updated));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Bật hoặc khoá tài khoản nhân viên (Chỉ Admin)")
    public ResponseEntity<ApiResponse<Void>> toggleUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body
    ) {
        Boolean isActive = body.getOrDefault("isActive", true);
        userService.toggleUserStatus(id, isActive);
        String msg = Boolean.TRUE.equals(isActive) ? "Kích hoạt tài khoản thành công!" : "Đã khoá tài khoản nhân viên!";
        return ResponseEntity.ok(ApiResponse.ok(msg, null));
    }

    @PutMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Đặt lại mật khẩu nhân viên (Chỉ Admin)")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        userService.resetPassword(id, request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.ok("Đặt lại mật khẩu nhân viên thành công!", null));
    }

    // ==========================================
    // 2. PERSONAL PROFILE (ALL AUTHENTICATED USERS)
    // ==========================================

    @GetMapping("/profile")
    @Operation(summary = "Xem hồ sơ cá nhân của tài khoản đang đăng nhập")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentProfile() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getCurrentUserProfile()));
    }

    @PutMapping("/profile")
    @Operation(summary = "Chỉnh sửa thông tin cá nhân (Họ tên, SĐT)")
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentProfile(
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        UserResponse updated = userService.updateCurrentUserProfile(request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật thông tin cá nhân thành công!", updated));
    }

    @PutMapping("/change-password")
    @Operation(summary = "Đổi mật khẩu tài khoản cá nhân")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changeCurrentUserPassword(request);
        return ResponseEntity.ok(ApiResponse.ok("Đổi mật khẩu thành công!", null));
    }
}

