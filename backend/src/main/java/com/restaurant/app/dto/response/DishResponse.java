package com.restaurant.app.dto.response;

import com.restaurant.app.entity.enums.DishStatus;
import com.restaurant.app.entity.enums.Station;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DishResponse {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private String name;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private BigDecimal scheduledPrice;
    private LocalDate priceEffectiveDate;
    private Integer preparationTime;
    private Station station;
    private String imageUrl;
    private String description;
    private String unit;
    private Boolean isAvailable;
    private DishStatus status;
}

