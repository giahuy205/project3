package com.restaurant.app.service.impl;

import com.restaurant.app.dto.request.*;
import com.restaurant.app.dto.response.UserResponse;
import com.restaurant.app.entity.Branch;
import com.restaurant.app.entity.User;
import com.restaurant.app.entity.enums.Role;
import com.restaurant.app.exception.ResourceNotFoundException;
import com.restaurant.app.repository.BranchRepository;
import com.restaurant.app.repository.UserRepository;
import com.restaurant.app.security.UserDetailsImpl;
import com.restaurant.app.service.AuthService;
import com.restaurant.app.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers(String search, Role role, Boolean isActive, Long branchId) {
        List<User> users;
        if (branchId != null) {
            users = userRepository.findByBranchIdOrderByCreatedAtDesc(branchId);
        } else {
            users = userRepository.findAllByOrderByCreatedAtDesc();
        }

        return users.stream()
                .filter(u -> filterUser(u, search, role, isActive))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getBranchUsers(Long branchId, String search, Role role, Boolean isActive) {
        if (branchId == null) {
            UserDetailsImpl current = authService.getCurrentUser();
            if (current != null) {
                branchId = current.getBranchId();
            }
        }

        List<User> users = branchId != null
                ? userRepository.findByBranchIdOrderByCreatedAtDesc(branchId)
                : userRepository.findAllByOrderByCreatedAtDesc();

        return users.stream()
                .filter(u -> filterUser(u, search, role, isActive))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên với ID: " + id));
        return mapToResponse(user);
    }

    @Override
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new IllegalArgumentException("Tên đăng nhập '" + request.getUsername().trim() + "' đã tồn tại!");
        }

        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với ID: " + request.getBranchId()));

        User user = User.builder()
                .username(request.getUsername().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role(request.getRole())
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .branch(branch)
                .isActive(true)
                .build();

        User saved = userRepository.save(user);
        log.info("Tạo tài khoản nhân viên mới thành công: username={}, role={}, branch={}",
                saved.getUsername(), saved.getRole(), branch.getName());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên với ID: " + id));

        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với ID: " + request.getBranchId()));

        user.setFullName(request.getFullName().trim());
        user.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        user.setRole(request.getRole());
        user.setBranch(branch);

        User saved = userRepository.save(user);
        log.info("Cập nhật thông tin nhân viên ID={}: fullName={}, role={}, branchId={}",
                id, saved.getFullName(), saved.getRole(), branch.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void toggleUserStatus(Long id, Boolean isActive) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên với ID: " + id));

        UserDetailsImpl current = authService.getCurrentUser();
        if (current != null && current.getId().equals(id) && Boolean.FALSE.equals(isActive)) {
            throw new IllegalArgumentException("Bạn không thể tự khoá tài khoản đang đăng nhập của chính mình!");
        }

        user.setIsActive(isActive);
        userRepository.save(user);
        log.info("Cập nhật trạng thái nhân viên ID={} thành isActive={}", id, isActive);
    }

    @Override
    @Transactional
    public void resetPassword(Long id, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên với ID: " + id));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Đặt lại mật khẩu cho nhân viên ID={} thành công", id);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUserProfile() {
        UserDetailsImpl current = authService.getCurrentUser();
        if (current == null) {
            throw new IllegalArgumentException("Chưa xác thực danh tính người dùng!");
        }

        User user = userRepository.findById(current.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản đang đăng nhập!"));
        return mapToResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateCurrentUserProfile(UpdateProfileRequest request) {
        UserDetailsImpl current = authService.getCurrentUser();
        if (current == null) {
            throw new IllegalArgumentException("Chưa xác thực danh tính người dùng!");
        }

        User user = userRepository.findById(current.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản đang đăng nhập!"));

        user.setFullName(request.getFullName().trim());
        user.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);

        User saved = userRepository.save(user);
        log.info("Người dùng ID={} cập nhật thông tin cá nhân: fullName={}, phone={}",
                user.getId(), saved.getFullName(), saved.getPhone());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void changeCurrentUserPassword(ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới và xác nhận mật khẩu không trùng khớp!");
        }

        UserDetailsImpl current = authService.getCurrentUser();
        if (current == null) {
            throw new IllegalArgumentException("Chưa xác thực danh tính người dùng!");
        }

        User user = userRepository.findById(current.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản đang đăng nhập!"));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không chính xác!");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Người dùng ID={} đổi mật khẩu thành công", user.getId());
    }

    private boolean filterUser(User u, String search, Role role, Boolean isActive) {
        if (role != null && u.getRole() != role) {
            return false;
        }
        if (isActive != null && !isActive.equals(u.getIsActive())) {
            return false;
        }
        if (search != null && !search.trim().isEmpty()) {
            String term = search.trim().toLowerCase();
            boolean matchName = u.getFullName() != null && u.getFullName().toLowerCase().contains(term);
            boolean matchUsername = u.getUsername() != null && u.getUsername().toLowerCase().contains(term);
            boolean matchPhone = u.getPhone() != null && u.getPhone().toLowerCase().contains(term);
            return matchName || matchUsername || matchPhone;
        }
        return true;
    }

    private UserResponse mapToResponse(User user) {
        String branchName = user.getBranch() != null ? user.getBranch().getName() : "Nhà hàng Nom Nom";
        if (branchName != null && (branchName.contains("Bách Khoa") || branchName.contains("HUST"))) {
            branchName = "Nhà hàng Nom Nom";
        }
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .phone(user.getPhone())
                .isActive(user.getIsActive())
                .branchId(user.getBranch() != null ? user.getBranch().getId() : 1L)
                .branchName(branchName)
                .createdAt(user.getCreatedAt())
                .build();
    }
}

