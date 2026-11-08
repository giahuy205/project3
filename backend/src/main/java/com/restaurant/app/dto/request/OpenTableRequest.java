package com.restaurant.app.dto.request;

import com.restaurant.app.entity.enums.OrderType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpenTableRequest {

    // Nếu là đơn tại bàn thì tableId bắt buộc, nếu mang về thì có thể null
    private Long tableId;

    @NotNull(message = "Chi nhánh không được để trống")
    @Builder.Default
    private Long branchId = 1L;

    @Builder.Default
    private OrderType orderType = OrderType.DINE_IN;

    private String customerPhone;
    private String customerName;
    private String notes;
}

