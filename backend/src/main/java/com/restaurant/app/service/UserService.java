package com.restaurant.app.service;

import com.restaurant.app.dto.request.*;
import com.restaurant.app.dto.response.UserResponse;
import com.restaurant.app.entity.enums.Role;

import java.util.List;

public interface UserService {

    List<UserResponse> getAllUsers(String search, Role role, Boolean isActive, Long branchId);

    List<UserResponse> getBranchUsers(Long branchId, String search, Role role, Boolean isActive);

    UserResponse getUserById(Long id);

    UserResponse createUser(CreateUserRequest request);

    UserResponse updateUser(Long id, UpdateUserRequest request);

    void toggleUserStatus(Long id, Boolean isActive);

    void resetPassword(Long id, String newPassword);

    UserResponse getCurrentUserProfile();

    UserResponse updateCurrentUserProfile(UpdateProfileRequest request);

    void changeCurrentUserPassword(ChangePasswordRequest request);
}

