package com.restaurant.app.controller;

import com.restaurant.app.dto.request.LoginRequest;
import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.JwtResponse;
import com.restaurant.app.security.UserDetailsImpl;
import com.restaurant.app.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "APIs Xác thực & Đăng nhập")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập hệ thống (Lấy JWT Token)")
    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        JwtResponse jwtResponse = authService.login(loginRequest);
        return ResponseEntity.ok(ApiResponse.ok("Đăng nhập thành công!", jwtResponse));
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin tài khoản đang đăng nhập")
    public ResponseEntity<ApiResponse<UserDetailsImpl>> getCurrentUser() {
        UserDetailsImpl userDetails = authService.getCurrentUser();
        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa xác thực danh tính!"));
        }
        return ResponseEntity.ok(ApiResponse.ok(userDetails));
    }
}

