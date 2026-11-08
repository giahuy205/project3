package com.restaurant.app.dto.request;

import com.restaurant.app.entity.enums.KitchenStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateKitchenStatusRequest {

    @NotNull(message = "Trạng thái bếp không được để trống")
    private KitchenStatus status;
}

