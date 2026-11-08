package com.restaurant.app.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddOrderItemsRequest {

    @NotEmpty(message = "Danh sách món gọi không được để trống")
    @Valid
    private List<OrderItemRequest> items;
}

