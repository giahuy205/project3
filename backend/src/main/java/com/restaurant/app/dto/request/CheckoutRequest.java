package com.restaurant.app.dto.request;

import com.restaurant.app.entity.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequest {

    @NotNull(message = "Mã đơn hàng không được để trống!")
    private Long orderId;

    private String customerPhone;

    private String voucherCode;

    private Integer pointsToUse;

    @NotNull(message = "Phương thức thanh toán không được để trống!")
    private PaymentMethod paymentMethod;

    private BigDecimal receivedAmount;

    private String note;
}

