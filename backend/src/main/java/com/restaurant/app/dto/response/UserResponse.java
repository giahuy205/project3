package com.restaurant.app.dto.response;

import com.restaurant.app.entity.enums.Role;
import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String fullName;
    private Role role;
    private String phone;
    private Boolean isActive;
    private Long branchId;
    private String branchName;
    private OffsetDateTime createdAt;
}

