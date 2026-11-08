package com.restaurant.app.dto.request;

import com.restaurant.app.entity.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateUserRequest {

    @NotBlank(message = "Tên đăng nhập không được để trống!")
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự!")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống!")
    @Size(min = 6, message = "Mật khẩu phải từ 6 ký tự trở lên!")
    private String password;

    @NotBlank(message = "Họ và tên không được để trống!")
    private String fullName;

    @NotNull(message = "Vai trò không được để trống!")
    private Role role;

    private String phone;

    @NotNull(message = "Chi nhánh không được để trống!")
    private Long branchId;
}

