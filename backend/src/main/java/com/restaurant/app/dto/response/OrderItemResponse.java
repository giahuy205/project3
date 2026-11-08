package com.restaurant.app.dto.response;

import com.restaurant.app.entity.enums.KitchenStatus;
import com.restaurant.app.entity.enums.Station;
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
public class OrderItemResponse {
    private Long id;
    private Long dishId;
    private String dishName;
    private String dishImageUrl;
    private String unit;
    private Station station;
    private Integer preparationTime;
    private Integer quantity;
    private BigDecimal priceAtOrder;
    private BigDecimal totalPrice;
    private String notes;
    private KitchenStatus kitchenStatus;
    private String cancelReason;
    private OffsetDateTime createdAt;
}

