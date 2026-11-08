package com.restaurant.app.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateReservationRequest {

    @Builder.Default
    private Long branchId = 1L;

    @NotBlank(message = "Tên khách hàng không được để trống!")
    private String customerName;

    @NotBlank(message = "Số điện thoại không được để trống!")
    private String phone;

    @NotNull(message = "Số lượng khách không được để trống!")
    @Min(value = 1, message = "Số lượng khách tối thiểu là 1 người!")
    private Integer guestCount;

    @NotNull(message = "Thời gian đặt bàn không được để trống!")
    private OffsetDateTime reservationTime;

    private Long tableId;

    private BigDecimal depositAmount;

    private String notes;
}

