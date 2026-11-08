package com.restaurant.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CancelItemRequest {

    @NotBlank(message = "Lý do hủy món không được để trống")
    private String cancelReason;
}

