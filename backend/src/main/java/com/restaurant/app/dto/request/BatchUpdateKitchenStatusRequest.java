package com.restaurant.app.dto.request;

import com.restaurant.app.entity.enums.KitchenStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchUpdateKitchenStatusRequest {

    @NotEmpty(message = "Danh sách món không được để trống")
    private List<Long> orderItemIds;

    @NotNull(message = "Trạng thái không được để trống")
    private KitchenStatus status;
}

