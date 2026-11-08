package com.restaurant.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AreaRequest {

    @NotNull(message = "Chi nhánh không được để trống")
    private Long branchId;

    @NotBlank(message = "Tên khu vực không được để trống")
    private String name;
}

