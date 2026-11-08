package com.restaurant.app.dto.response;

import com.restaurant.app.entity.enums.PaymentMethod;
import com.restaurant.app.entity.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillResponse {

    private Long id;
    private String billCode;
    private Long orderId;
    private String orderCode;
    private String tableName;
    private String cashierName;
    private String customerName;
    private String customerPhone;
    private String voucherCode;

    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private Integer pointsUsed;
    private BigDecimal pointsDiscount;
    private BigDecimal vatRate;
    private BigDecimal vatAmount;
    private BigDecimal finalAmount;
    private BigDecimal receivedAmount;
    private BigDecimal changeAmount;

    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private OffsetDateTime createdAt;

    private List<OrderItemResponse> items;
}

