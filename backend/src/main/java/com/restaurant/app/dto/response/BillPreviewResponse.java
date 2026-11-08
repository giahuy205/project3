package com.restaurant.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillPreviewResponse {

    private Long orderId;
    private String orderCode;
    private String tableName;
    private Integer guestCount;

    private BigDecimal subtotal;
    private BigDecimal voucherDiscount;
    private String voucherCode;
    private Integer pointsUsed;
    private BigDecimal pointsDiscount;
    private BigDecimal vatRate;
    private BigDecimal vatAmount;
    private BigDecimal finalAmount;

    private Integer pointsEarned;
    private String customerName;
    private Integer customerCurrentPoints;
}

