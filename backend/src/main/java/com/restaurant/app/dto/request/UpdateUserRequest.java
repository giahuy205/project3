package com.restaurant.app.dto.request;

import com.restaurant.app.entity.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserRequest {

    @NotBlank(message = "Họ và tên không được để trống!")
    private String fullName;

    private String phone;

    @NotNull(message = "Vai trò không được để trống!")
    private Role role;

    @NotNull(message = "Chi nhánh không được để trống!")
    private Long branchId;
}

