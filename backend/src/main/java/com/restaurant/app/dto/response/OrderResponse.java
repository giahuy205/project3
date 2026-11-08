package com.restaurant.app.dto.response;

import com.restaurant.app.entity.enums.OrderStatus;
import com.restaurant.app.entity.enums.OrderType;
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
public class OrderResponse {
    private Long id;
    private String orderCode;
    private Long branchId;
    private Long tableId;
    private String tableNumber;
    private String tableName;
    private String areaName;
    private Integer guestCount;
    private Long staffId;
    private String staffName;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private OrderType orderType;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private String notes;
    private List<OrderItemResponse> items;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}

