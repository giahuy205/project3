package com.restaurant.app.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemRequest {

    @NotNull(message = "Món ăn không được để trống")
    private Long dishId;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng gọi món phải ít nhất là 1")
    private Integer quantity;

    private String notes;
}

